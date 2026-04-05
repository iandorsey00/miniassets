import { BarcodeScanner } from "@/components/barcode-scanner";
import { PageHeader, Panel } from "@/components/ui";
import { createAssetAction } from "@/lib/actions";
import { locationKindLabels } from "@/lib/constants";
import { getLocationsData } from "@/lib/data";

export default async function NewAssetPage({
  searchParams,
}: {
  searchParams: Promise<{ workspaceId?: string }>;
}) {
  const params = await searchParams;
  const data = await getLocationsData(params.workspaceId);

  return (
    <>
      <PageHeader title={data.dictionary.assets.newTitle} subtitle={data.dictionary.assets.subtitle} />

      <div className="grid-2">
        <Panel title={data.dictionary.assets.scannerTitle}>
          <div className="stack">
            <p className="muted">{data.dictionary.assets.scannerHelp}</p>
            <BarcodeScanner targetInputId="barcodeValue" lookupEndpoint="/api/barcodes/lookup" />
            <p className="muted">{data.dictionary.assets.lookupHelp}</p>
          </div>
        </Panel>

        <Panel title={data.dictionary.assets.newTitle}>
          <form action={createAssetAction} className="form-grid">
            <input type="hidden" name="workspaceId" value={data.currentWorkspace?.id ?? ""} />

            <div className="field-stack">
              <label htmlFor="assetCode">{data.dictionary.common.itemCode}</label>
              <input id="assetCode" name="assetCode" required placeholder="AST-0100" />
            </div>

            <div className="field-stack">
              <label htmlFor="currentLocationId">{data.dictionary.common.location}</label>
              <select id="currentLocationId" name="currentLocationId" defaultValue="">
                <option value="">{data.dictionary.assets.currentLocationFallback}</option>
                {data.locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {locationKindLabels[location.kind][data.locale === "ZH_CN" ? "zh" : "en"]} · {location.nameEn || location.nameZh || location.code || location.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label htmlFor="nameEn">{data.dictionary.common.englishName}</label>
              <input id="nameEn" name="nameEn" />
            </div>

            <div className="field-stack">
              <label htmlFor="nameZh">{data.dictionary.common.chineseName}</label>
              <input id="nameZh" name="nameZh" />
            </div>

            <div className="field-stack">
              <label htmlFor="brand">{data.dictionary.common.brand}</label>
              <input id="brand" name="brand" />
            </div>

            <div className="field-stack">
              <label htmlFor="model">{data.dictionary.common.model}</label>
              <input id="model" name="model" />
            </div>

            <div className="field-stack">
              <label htmlFor="barcodeValue">{data.dictionary.common.barcode}</label>
              <input id="barcodeValue" name="barcodeValue" />
            </div>

            <div className="field-stack">
              <label htmlFor="barcodeFormat">Barcode format</label>
              <input id="barcodeFormat" name="barcodeFormat" />
            </div>

            <div className="field-stack">
              <label htmlFor="trackingMode">{data.dictionary.common.trackingMode}</label>
              <select id="trackingMode" name="trackingMode" defaultValue="INDIVIDUAL">
                <option value="INDIVIDUAL">Individual</option>
                <option value="GROUP">Group</option>
              </select>
            </div>

            <div className="field-stack">
              <label htmlFor="quantity">{data.dictionary.common.quantity}</label>
              <input id="quantity" name="quantity" type="number" min="1" defaultValue="1" />
            </div>

            <div className="field-stack">
              <label htmlFor="sensitivityLevel">{data.dictionary.common.sensitivity}</label>
              <select id="sensitivityLevel" name="sensitivityLevel" defaultValue="LOW">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
              </select>
            </div>

            <div className="field-stack">
              <label htmlFor="barcodeSource">Barcode source</label>
              <input id="barcodeSource" name="barcodeSource" defaultValue="manual-or-scan" />
            </div>

            <div className="field-stack full-span">
              <label htmlFor="description">{data.dictionary.common.description}</label>
              <textarea id="description" name="description" />
            </div>

            <div className="field-stack full-span">
              <label htmlFor="notes">{data.dictionary.common.notes}</label>
              <textarea id="notes" name="notes" />
            </div>

            <div className="full-span">
              <button type="submit">{data.dictionary.common.create}</button>
            </div>
          </form>
        </Panel>
      </div>
    </>
  );
}
