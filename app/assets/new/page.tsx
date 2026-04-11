import { BarcodeScanner } from "@/components/barcode-scanner";
import { AssetCreateForm } from "@/components/asset-create-form";
import { PageHeader, Panel } from "@/components/ui";
import { createAssetAction } from "@/lib/actions";
import { buildLocationPath, getLocationsData } from "@/lib/data";

export default async function NewAssetPage({
  searchParams,
}: {
  searchParams: Promise<{ workspaceId?: string }>;
}) {
  const params = await searchParams;
  const data = await getLocationsData(params.workspaceId);
  const locationOptions = data.locations.map((location) => ({
    id: location.id,
    path: buildLocationPath(data.locations, location.id, data.locale) || location.code || location.id,
    code: location.code,
    nameEn: location.nameEn,
    nameZh: location.nameZh,
  }));

  return (
    <>
      <PageHeader title={data.dictionary.assets.newTitle} subtitle={data.dictionary.assets.subtitle} />

      <div className="grid-2">
        <Panel title={data.dictionary.assets.scannerTitle}>
          <div className="stack">
            <p className="muted">{data.dictionary.assets.scannerHelp}</p>
            <BarcodeScanner
              targetInputId="barcodeValue"
              lookupEndpoint="/api/barcodes/lookup"
              labels={{
                start: data.dictionary.assets.scannerStart,
                stop: data.dictionary.assets.scannerStop,
                unavailable: data.dictionary.assets.scannerUnavailable,
                cameraFailed: data.dictionary.assets.scannerCameraFailed,
                lookupSuccess: data.dictionary.assets.scannerLookupSuccess,
                lookupMissing: data.dictionary.assets.scannerLookupMissing,
                lookupFailed: data.dictionary.assets.scannerLookupFailed,
              }}
            />
            <p className="muted">{data.dictionary.assets.lookupHelp}</p>
          </div>
        </Panel>

        <Panel title={data.dictionary.assets.newTitle}>
          <AssetCreateForm
            action={createAssetAction}
            workspaceId={data.currentWorkspace?.id ?? ""}
            locale={data.locale}
            dictionary={data.dictionary}
            locationOptions={locationOptions}
            assetFieldSuggestions={data.assetFieldSuggestions}
          />
        </Panel>
      </div>
    </>
  );
}
