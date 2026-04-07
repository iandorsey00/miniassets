"use client";

import { useState } from "react";

export function AssortedQuantityFields({
  assortedLabel,
  quantityLabel,
  estimatedQuantityLabel,
  helpText,
  defaultAssorted = false,
  defaultQuantity = 1,
}: {
  assortedLabel: string;
  quantityLabel: string;
  estimatedQuantityLabel: string;
  helpText: string;
  defaultAssorted?: boolean;
  defaultQuantity?: number;
}) {
  const [isAssorted, setIsAssorted] = useState(defaultAssorted);

  return (
    <>
      <div className="field-stack">
        <label className="checkbox-row" htmlFor="isAssorted">
          <input
            id="isAssorted"
            name="isAssorted"
            type="checkbox"
            value="true"
            checked={isAssorted}
            onChange={(event) => setIsAssorted(event.target.checked)}
          />
          <span>{assortedLabel}</span>
        </label>
        <p className="muted">{helpText}</p>
      </div>

      <div className="field-stack">
        <label htmlFor="quantity">{isAssorted ? estimatedQuantityLabel : quantityLabel}</label>
        <input id="quantity" name="quantity" type="number" min="1" defaultValue={defaultQuantity} />
      </div>
    </>
  );
}
