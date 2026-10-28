"""The product catalogue comes from the questionnaire, not from a hand kept list."""

from __future__ import annotations

import pytest
from sqlalchemy import delete

from app.models.analysis import ProvinceFoodSummary
from app.models.enums import FoodGroup, ProductStatus
from app.models.household import FoodItem
from app.models.survey import Survey
from app.services import product_catalogue, reference_service
from tests.conftest import API, admin_headers

# The three families the questionnaire uses to ask what a household grows, plus
# one variable that is not a food at all.
CROP_LABELS = [
    ("h24_01", "Maize grown"),
    ("h24_12", "Yams& Taro grown"),
    ("h25_19", "Pumpkin grown"),
    ("h25_20", "Cocumber grown"),
    ("h25_21", "Mushroom grown"),
    ("h25_24", "Other vegetables grown"),
    ("h28b1_13", "Grow Watermelon"),
    ("h28b1_15", "Grow Other fruit"),
    ("p04", "Age"),
]

HOUSEHOLDS_TOTAL = 1000


@pytest.fixture
def survey_with_questionnaire(db):
    """A survey whose dictionary and national aggregates are already in place."""
    from app.analysis.dictionary import DictionaryEntry, store_dictionary

    survey = Survey(
        name="Catalogue census",
        year=2022,
        original_filename="catalogue.dta",
        stored_path="catalogue/catalogue.dta",
        file_size_bytes=1,
        checksum_sha256="c" * 64,
        status="ready",
    )
    db.add(survey)
    db.commit()

    # The catalogue is global reference data, so start from nothing.
    db.execute(delete(ProvinceFoodSummary))
    db.execute(delete(FoodItem))
    db.commit()

    store_dictionary(
        db,
        survey.id,
        [
            DictionaryEntry(
                variable_name=variable,
                label=label,
                section="household",
                dtype=None,
                position=position,
            )
            for position, (variable, label) in enumerate(CROP_LABELS)
        ],
    )
    reference_service.seed_food_items(db, survey_id=survey.id, overwrite=True)

    counts = {
        "h24_01": 400,
        "h24_12": 30,
        "h25_19": 25,
        "h25_20": 10,
        "h25_21": 5,
        "h25_24": 2,
        "h28b1_13": 60,
        "h28b1_15": 1,
    }
    items = {item.source_variable: item for item in db.query(FoodItem).all()}
    for variable, with_food in counts.items():
        db.add(
            ProvinceFoodSummary(
                survey_id=survey.id,
                food_item_id=items[variable].id,
                level="national",
                households_total=HOUSEHOLDS_TOTAL,
                households_with_food=with_food,
                weighted_households_total=HOUSEHOLDS_TOTAL,
                weighted_households_with_food=with_food,
            )
        )
    db.commit()
    return survey


class TestNameDerivation:
    def test_a_grown_suffix_is_dropped(self):
        assert reference_service.product_name_from_label("Maize grown", "h24_01") == "Maize"

    def test_a_grow_prefix_is_dropped(self):
        assert (
            reference_service.product_name_from_label("Grow Watermelon", "h28b1_13") == "Watermelon"
        )

    def test_an_ampersand_becomes_and(self):
        assert (
            reference_service.product_name_from_label("Yams& Taro grown", "h24_12")
            == "Yams and Taro"
        )

    def test_a_questionnaire_misspelling_is_corrected(self):
        assert reference_service.product_name_from_label("Cocumber grown", "h25_20") == "Cucumber"

    def test_a_missing_label_falls_back_to_the_variable_name(self):
        assert reference_service.product_name_from_label(None, "h24_99") == "h24_99"
        assert reference_service.product_name_from_label("   ", "h24_99") == "h24_99"


class TestClassification:
    def test_field_crops_have_no_count_variable(self):
        assert reference_service.classify_food_variable("h24_01") == (
            FoodGroup.FIELD_CROP,
            None,
        )

    def test_mushroom_is_a_fungus_not_a_vegetable(self):
        group, _ = reference_service.classify_food_variable("h25_21")
        assert group is FoodGroup.FUNGI

    def test_a_fruit_is_paired_with_its_count_variable(self):
        assert reference_service.classify_food_variable("h28b1_13") == (
            FoodGroup.FRUIT,
            "h28b2_13",
        )

    def test_a_variable_outside_the_product_families_is_ignored(self):
        assert reference_service.classify_food_variable("p04") is None

    def test_the_other_bucket_is_marked_as_a_catch_all(self):
        derived = {v.source_variable: v for v in reference_service.food_variables_from_fallback()}
        assert derived["h28b1_15"].is_catch_all is True
        assert derived["h28b1_13"].is_catch_all is False


class TestDictionaryDerivation:
    def test_names_come_from_the_stored_questionnaire_labels(self, db, survey_with_questionnaire):
        variables = reference_service.food_variables_from_dictionary(
            db, survey_with_questionnaire.id
        )
        by_variable = {v.source_variable: v.standard_name for v in variables}

        assert by_variable["h24_01"] == "Maize"
        assert by_variable["h25_20"] == "Cucumber"
        assert by_variable["h28b1_13"] == "Watermelon"
        assert "p04" not in by_variable

    def test_a_survey_without_a_dictionary_falls_back_to_the_static_list(self, db):
        import uuid

        variables = reference_service.food_variables_from_dictionary(db, uuid.uuid4())
        assert len(variables) == 61


class TestCandidates:
    def test_candidates_carry_the_household_evidence(self, db, survey_with_questionnaire):
        candidates = product_catalogue.product_candidates(db, survey_with_questionnaire.id)
        by_variable = {c.source_variable: c for c in candidates}

        maize = by_variable["h24_01"]
        assert maize.name_en == "Maize"
        assert maize.households_with_food == 400
        assert maize.households_total == HOUSEHOLDS_TOTAL
        assert maize.share == pytest.approx(0.4)

        # The catch-all is counted so the aggregate stays complete, but it is
        # not something a farmer can plant.
        assert by_variable["h25_24"].is_catch_all is True
        assert by_variable["h25_24"].should_create is False

    def test_an_unaggregated_survey_is_reported_rather_than_invented(self, db):
        survey = Survey(
            name="Not analysed",
            year=2023,
            original_filename="x.dta",
            stored_path="x/x.dta",
            file_size_bytes=1,
            checksum_sha256="d" * 64,
            status="ready",
        )
        db.add(survey)
        db.commit()
        with pytest.raises(product_catalogue.AnalysisNotReady):
            product_catalogue.product_candidates(db, survey.id)

    def test_creating_products_is_idempotent(self, db, survey_with_questionnaire):
        # Eight food variables, two of them "other" buckets, so six products.
        first = product_catalogue.create_products(db, survey_with_questionnaire.id)
        assert len(first.created) == 6
        assert first.already_existed == 0
        assert first.skipped == 2

        second = product_catalogue.create_products(db, survey_with_questionnaire.id)
        assert len(second.created) == 0
        assert second.already_existed == 6

        assert db.query(FoodItem).count() == 8
        from app.models.product import Product

        assert db.query(Product).count() == 6

    def test_a_new_product_starts_as_a_draft_awaiting_expert_review(
        self, db, survey_with_questionnaire
    ):
        product_catalogue.create_products(db, survey_with_questionnaire.id)
        from app.models.product import Product

        mushroom = db.query(Product).filter(Product.name_en == "Mushroom").one()
        assert mushroom.status is ProductStatus.DRAFT
        assert mushroom.needs_expert_review is True
        # Nothing invents nutrition or recipes, so those stay as blockers.
        assert mushroom.time_to_harvest_min_days is None


class TestCatalogueApi:
    def test_the_preview_lists_candidates_with_evidence(
        self, db, client, admin_factory, survey_with_questionnaire
    ):
        headers = admin_headers(admin_factory())
        response = client.get(
            f"{API}/admin/surveys/{survey_with_questionnaire.id}/product-candidates",
            headers=headers,
        )
        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 8
        assert body["creatable"] == 6
        assert body["skipped"] == 2
        assert body["already_created"] == 0

    def test_confirming_creates_the_catalogue_then_reports_it_as_existing(
        self, db, client, admin_factory, survey_with_questionnaire
    ):
        headers = admin_headers(admin_factory())
        url = f"{API}/admin/surveys/{survey_with_questionnaire.id}/products"

        first = client.post(url, headers=headers)
        assert first.status_code == 201
        assert first.json()["created"] == 6
        assert first.json()["skipped"] == 2

        second = client.post(url, headers=headers)
        assert second.status_code == 201
        assert second.json()["created"] == 0
        assert second.json()["already_existed"] == 6

    def test_confirming_requires_the_product_write_permission(
        self, db, client, admin_factory, survey_with_questionnaire
    ):
        from app.models.enums import AdminRole

        # A data analyst can read products but not create them.
        headers = admin_headers(admin_factory(role=AdminRole.DATA_ANALYST))
        response = client.post(
            f"{API}/admin/surveys/{survey_with_questionnaire.id}/products", headers=headers
        )
        assert response.status_code == 403

    def test_confirming_before_analysis_returns_a_clear_conflict(self, db, client, admin_factory):
        survey = Survey(
            name="No analysis",
            year=2023,
            original_filename="y.dta",
            stored_path="y/y.dta",
            file_size_bytes=1,
            checksum_sha256="e" * 64,
            status="ready",
        )
        db.add(survey)
        db.commit()

        headers = admin_headers(admin_factory())
        response = client.post(f"{API}/admin/surveys/{survey.id}/products", headers=headers)
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "products.analysis_not_ready"
