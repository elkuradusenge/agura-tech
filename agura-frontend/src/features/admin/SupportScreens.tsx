/** Support boards: specialist requests and funding interest. */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminSupportApi } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { formatDate } from "../../lib/utils";
import { Badge, Button, Card, Field, Input, Select, Skeleton } from "../../components/ui";
import type { FundingInterestRead, SpecialistRequestRead } from "../../lib/api/types";

const REQUEST_STATUSES = ["new", "assigned", "contacted", "closed"] as const;
const FUNDING_STATUSES = ["new", "reviewing", "referred_to_brd", "closed"] as const;

export function SpecialistRequestsScreen() {
  const { t, language } = useI18n();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>("new");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-support", "requests", status],
    queryFn: () => adminSupportApi.specialistRequests({ status }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("nav.specialistRequests")}</h1>
        <div className="w-40">
          <Select aria-label="status" value={status} onChange={(event) => setStatus(event.target.value)}>
            {REQUEST_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isLoading ? <Skeleton className="h-32" /> : null}
      {data?.items.length ? (
        <ul className="space-y-2">
          {data.items.map((request: SpecialistRequestRead) => (
            <li key={request.id} className="card space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{request.specialist_type}</Badge>
                <Badge tone={request.status === "new" ? "warning" : "success"}>{request.status}</Badge>
                <span className="muted ml-auto text-xs">{formatDate(request.created_at, language)}</span>
              </div>
              <p className="text-sm">{request.description}</p>
              <div className="flex flex-wrap gap-1">
                {(["assigned", "contacted", "closed"] as const).map((next) => (
                  <Button
                    key={next}
                    variant="ghost"
                    onClick={async () => {
                      await adminSupportApi.updateSpecialistRequest(request.id, { status: next });
                      void queryClient.invalidateQueries({ queryKey: ["admin-support", "requests"] });
                    }}
                  >
                    {next}
                  </Button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : !isLoading ? (
        <p className="muted text-sm">{t("common.empty")}</p>
      ) : null}
    </div>
  );
}

export function FundingInterestScreen() {
  const { t, language } = useI18n();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>("new");
  const [reference, setReference] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-support", "funding", status],
    queryFn: () => adminSupportApi.fundingInterest({ status }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("nav.fundingInterest")}</h1>
        <div className="w-40">
          <Select aria-label="status" value={status} onChange={(event) => setStatus(event.target.value)}>
            {FUNDING_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isLoading ? <Skeleton className="h-32" /> : null}
      {data?.items.length ? (
        <ul className="space-y-2">
          {data.items.map((row: FundingInterestRead) => (
            <li key={row.id} className="card space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={row.status === "new" ? "warning" : "success"}>{row.status}</Badge>
                <span className="muted text-xs">
                  {row.location} - {row.planned_size} - {row.building_or_land}
                </span>
                <span className="muted ml-auto text-xs">{formatDate(row.created_at, language)}</span>
              </div>
              {row.experience ? <p className="text-sm">Experience: {row.experience}</p> : null}
              {row.funding_needed ? <p className="text-sm">Needed: {row.funding_needed} RWF</p> : null}
              {row.brd_reference ? <p className="text-sm">BRD: {row.brd_reference}</p> : null}
              {row.status !== "referred_to_brd" ? (
                <Card className="space-y-2">
                  <Field label="BRD reference" htmlFor={`brd-${row.id}`}>
                    <Input id={`brd-${row.id}`} value={reference} onChange={(event) => setReference(event.target.value)} />
                  </Field>
                  <Button
                    disabled={!reference.trim()}
                    onClick={async () => {
                      await adminSupportApi.referToBrd(row.id, { brd_reference: reference });
                      setReference("");
                      void queryClient.invalidateQueries({ queryKey: ["admin-support", "funding"] });
                    }}
                  >
                    {t("funding.status.referred_to_brd")}
                  </Button>
                </Card>
              ) : null}
            </li>
          ))}
        </ul>
      ) : !isLoading ? (
        <p className="muted text-sm">{t("common.empty")}</p>
      ) : null}
    </div>
  );
}
