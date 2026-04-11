import packageJson from "@/package.json";
import { PageHeader, Panel, StatusNotice } from "@/components/ui";
import { updateSettingsAction } from "@/lib/actions";
import { getSettingsData } from "@/lib/data";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const params = await searchParams;
  const data = await getSettingsData();

  return (
    <>
      <PageHeader title={data.dictionary.settings.title} subtitle={data.dictionary.settings.subtitle} />

      {params.saved === "1" ? <StatusNotice message={data.dictionary.common.savedMessage} /> : null}

      <div className="grid-2">
        <Panel title={data.dictionary.settings.estimationTitle}>
          <form action={updateSettingsAction} className="form-grid">
            <div className="field-stack">
              <label htmlFor="unrecordedItemsPerThousand">{data.dictionary.settings.itemsPerThousand}</label>
              <input
                id="unrecordedItemsPerThousand"
                name="unrecordedItemsPerThousand"
                type="number"
                min="0"
                max="500"
                step="1"
                defaultValue={data.settings.unrecordedItemsPerThousand}
              />
              <p className="muted">{data.dictionary.settings.itemsPerThousandHelp}</p>
            </div>

            <div className="field-stack full-span">
              <strong>{data.dictionary.settings.formulaLabel}</strong>
              <p className="muted">{data.dictionary.settings.formulaValue}</p>
              <p className="muted">{data.dictionary.settings.estimationHelp}</p>
            </div>

            <div className="full-span">
              <button type="submit">{data.dictionary.common.save}</button>
            </div>
          </form>
        </Panel>

        <Panel title={data.dictionary.settings.aboutTitle}>
          <div className="section-stack">
            <div className="split-line">
              <span>{data.dictionary.common.currentVersion}</span>
              <strong>{packageJson.version}</strong>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
