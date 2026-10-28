"""Reference data derived from the questionnaire a survey shipped with.

The catalogue of foods, and therefore the catalogue of products, is not a hand
written list. It is read back out of the questionnaire: every variable in the
crop, vegetable and fruit families is one food item, and its standard name is
the label that variable carries in the .dta file. If a later census adds a
crop, the catalogue picks it up without a code change.

`FOOD_VARIABLES` in `app.analysis.constants` is kept only as a fallback for
surveys whose dictionary has not been built yet, which is the case in unit
tests that start at a later stage.
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.analysis.constants import FOOD_VARIABLES
from app.models.enums import FoodGroup
from app.models.household import FoodItem
from app.models.survey import VariableDictionary

# Variable name families that answer "what does this household grow". The
# regex captures the numeric suffix so a fruit can be paired with its count
# variable, h28b1_03 with h28b2_03.
PRODUCT_FAMILIES: tuple[tuple[re.Pattern[str], FoodGroup, str], ...] = (
    (re.compile(r"^h24_(?P<suffix>\d{2})$"), FoodGroup.FIELD_CROP, ""),
    (re.compile(r"^h25_(?P<suffix>\d{2})$"), FoodGroup.VEGETABLE, ""),
    (re.compile(r"^h28b1_(?P<suffix>\d{2})$"), FoodGroup.FRUIT, "h28b2_"),
)

# Variables inside those families that are not a single kind of vegetable.
GROUP_OVERRIDES: dict[str, FoodGroup] = {
    "h25_21": FoodGroup.FUNGI,
}

# The questionnaire is a paper form that was typed in once, so a few labels
# carry a misspelling or a plural. These correct the label rather than replace
# it: the variable stays the source of truth.
LABEL_CORRECTIONS: dict[str, str] = {
    "cocumber": "Cucumber",
    "jack fruits": "Jack fruit",
    "passion fruits": "Passion fruit",
    "other crop type": "Other field crop",
}

_TRAILING_QUALIFIERS = (" grown", " reared")
_LEADING_QUALIFIERS = ("grow ",)


@dataclass(frozen=True)
class FoodVariable:
    source_variable: str
    standard_name: str
    group: FoodGroup
    count_variable: str | None

    @property
    def is_catch_all(self) -> bool:
        """The "other" bucket in a family is counted but is not a product."""
        return self.standard_name.lower().startswith("other ")


def product_name_from_label(label: str | None, fallback: str) -> str:
    """Turn a questionnaire label into a product name.

    "Maize grown" and "Grow Watermelon" describe the same thing, that the
    household grows it, so the qualifier is dropped and the crop remains.
    """
    if not label or not label.strip():
        return fallback

    text = " ".join(label.replace("&", " and ").split())

    for qualifier in _TRAILING_QUALIFIERS:
        if text.lower().endswith(qualifier):
            text = text[: -len(qualifier)]
            break
    for qualifier in _LEADING_QUALIFIERS:
        if text.lower().startswith(qualifier):
            text = text[len(qualifier) :]
            break

    text = " ".join(text.split()).strip(" .:-")
    if not text:
        return fallback

    return LABEL_CORRECTIONS.get(text.lower(), text)


def _count_variable_for(variable_name: str, count_prefix: str) -> str | None:
    if not count_prefix:
        return None
    for pattern, _, _ in PRODUCT_FAMILIES:
        match = pattern.match(variable_name)
        if match:
            return f"{count_prefix}{match.group('suffix')}"
    return None


def classify_food_variable(variable_name: str) -> tuple[FoodGroup, str | None] | None:
    """Return the group and count variable for a product variable, or None."""
    for pattern, group, count_prefix in PRODUCT_FAMILIES:
        if pattern.match(variable_name):
            return GROUP_OVERRIDES.get(variable_name, group), _count_variable_for(
                variable_name, count_prefix
            )
    return None


def food_variables_from_fallback() -> list[FoodVariable]:
    return [
        FoodVariable(
            source_variable=source_variable,
            standard_name=standard_name,
            group=group,
            count_variable=count_variable,
        )
        for source_variable, standard_name, group, count_variable in FOOD_VARIABLES
    ]


def food_variables_from_dictionary(db: Session, survey_id: uuid.UUID) -> list[FoodVariable]:
    """Read the food variables out of one survey's questionnaire.

    Falls back to the static list when the survey has no dictionary yet, so a
    job that resumes at a later stage still produces a catalogue.
    """
    rows = db.scalars(
        select(VariableDictionary)
        .where(VariableDictionary.survey_id == survey_id)
        .order_by(VariableDictionary.position)
    ).all()

    if not rows:
        return food_variables_from_fallback()

    derived: list[FoodVariable] = []
    for row in rows:
        classified = classify_food_variable(row.variable_name)
        if classified is None:
            continue
        group, count_variable = classified
        derived.append(
            FoodVariable(
                source_variable=row.variable_name,
                standard_name=product_name_from_label(row.label, row.variable_name),
                group=group,
                count_variable=count_variable,
            )
        )

    return derived or food_variables_from_fallback()


def seed_food_items(
    db: Session, *, survey_id: uuid.UUID | None = None, overwrite: bool = False
) -> int:
    """Create one food_items row per questionnaire food variable.

    Local names are left empty on purpose: Kinyarwanda names are entered by the
    content team after RAB review, never generated.
    """
    variables = (
        food_variables_from_dictionary(db, survey_id)
        if survey_id is not None
        else food_variables_from_fallback()
    )

    existing = {row.source_variable: row for row in db.scalars(select(FoodItem))}
    written = 0
    for variable in variables:
        item = existing.get(variable.source_variable)
        if item is not None:
            if not overwrite:
                continue
            item.standard_name = variable.standard_name
            item.group = variable.group
            item.count_variable = variable.count_variable
            item.nutrition_group = variable.group.value
        else:
            item = FoodItem(
                standard_name=variable.standard_name,
                local_name=None,
                group=variable.group,
                source_variable=variable.source_variable,
                count_variable=variable.count_variable,
                nutrition_group=variable.group.value,
            )
            db.add(item)
            existing[variable.source_variable] = item
        written += 1
    db.commit()
    return written
