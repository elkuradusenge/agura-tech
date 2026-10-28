"""Create the product catalogue for a survey, from its questionnaire and data.

Nothing here is invented. The products are the crop, vegetable and fruit
variables the questionnaire asked about, named with the label that variable
carries, and given the household counts the survey actually produced. A product
therefore arrives as a draft that is already tied to evidence, and the fields a
questionnaire cannot answer (nutrition, recipes, irrigation, expert review) stay
empty and are reported as blockers rather than filled with a guess.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.analysis import ProvinceFoodSummary
from app.models.enums import ProductStatus
from app.models.household import FoodItem
from app.models.product import Product
from app.services import product_service, reference_service

logger = logging.getLogger("agura.products.catalogue")

NATIONAL = "national"


class AnalysisNotReady(Exception):
    """The survey has no national aggregates yet, so there is no evidence."""


@dataclass
class ProductCandidate:
    source_variable: str
    food_item_id: uuid.UUID
    name_en: str
    group: str
    households_with_food: int
    households_total: int
    is_catch_all: bool
    product_id: uuid.UUID | None = None
    product_status: ProductStatus | None = None
    missing_fields: list[str] = field(default_factory=list)

    @property
    def share(self) -> float:
        if not self.households_total:
            return 0.0
        return round(self.households_with_food / self.households_total, 6)

    @property
    def should_create(self) -> bool:
        return not self.is_catch_all and self.product_id is None


def _national_evidence(db: Session, survey_id: uuid.UUID) -> dict[uuid.UUID, ProvinceFoodSummary]:
    rows = db.scalars(
        select(ProvinceFoodSummary).where(
            ProvinceFoodSummary.survey_id == survey_id,
            ProvinceFoodSummary.level == NATIONAL,
        )
    ).all()
    return {row.food_item_id: row for row in rows}


def product_candidates(db: Session, survey_id: uuid.UUID) -> list[ProductCandidate]:
    """Every product the questionnaire implies, with the evidence behind it.

    Raises AnalysisNotReady when the survey has not been aggregated, because a
    product with no household count would be a product of nothing.
    """
    reference_service.seed_food_items(db, survey_id=survey_id, overwrite=True)

    evidence = _national_evidence(db, survey_id)
    if not evidence:
        raise AnalysisNotReady(survey_id)

    food_items = db.scalars(select(FoodItem).order_by(FoodItem.source_variable)).all()
    existing_products = {
        product.food_item_id: product
        for product in db.scalars(
            select(Product).where(Product.food_item_id.in_([item.id for item in food_items]))
        )
    }

    variables = {
        v.source_variable: v
        for v in reference_service.food_variables_from_dictionary(db, survey_id)
    }

    candidates: list[ProductCandidate] = []
    for item in food_items:
        summary = evidence.get(item.id)
        if summary is None:
            continue
        variable = variables.get(item.source_variable)
        product = existing_products.get(item.id)
        candidates.append(
            ProductCandidate(
                source_variable=item.source_variable,
                food_item_id=item.id,
                name_en=item.standard_name,
                group=item.group.value,
                households_with_food=summary.households_with_food,
                households_total=summary.households_total,
                is_catch_all=bool(variable and variable.is_catch_all),
                product_id=product.id if product else None,
                product_status=product.status if product else None,
                missing_fields=[
                    blocker["field"] for blocker in product_service.trackable_blockers(product)
                ]
                if product
                else [],
            )
        )
    return candidates


@dataclass
class CreationResult:
    candidates: list[ProductCandidate]
    created: list[Product]
    already_existed: int
    skipped: int


def create_products(
    db: Session, survey_id: uuid.UUID, *, admin_id: uuid.UUID | None = None
) -> CreationResult:
    """Create a draft product per questionnaire food variable.

    Idempotent: a candidate that already has a product is left alone, so an
    admin can confirm twice without creating duplicates. The catch-all "other"
    variable is counted in the aggregates but is not a product, so it is
    skipped.
    """
    candidates = product_candidates(db, survey_id)
    created: list[Product] = []

    # Count before creating, because creating sets product_id on the candidate.
    already_existed = sum(1 for c in candidates if c.product_id is not None)
    skipped = sum(1 for c in candidates if c.is_catch_all and c.product_id is None)

    for candidate in candidates:
        if not candidate.should_create:
            continue
        product = Product(
            food_item_id=candidate.food_item_id,
            name_en=candidate.name_en[:160],
            status=ProductStatus.DRAFT,
            needs_expert_review=True,
        )
        db.add(product)
        db.flush()
        candidate.product_id = product.id
        candidate.product_status = product.status
        candidate.missing_fields = [
            blocker["field"] for blocker in product_service.trackable_blockers(product)
        ]
        created.append(product)

    db.commit()
    if created:
        logger.info("Created %s draft products from survey %s", len(created), survey_id)
    return CreationResult(
        candidates=candidates, created=created, already_existed=already_existed, skipped=skipped
    )
