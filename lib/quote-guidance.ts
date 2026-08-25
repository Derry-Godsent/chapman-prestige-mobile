import { formatGhs } from "./chapman-data";

export function calculateAreaSquareMetres(lengthInput: string, widthInput: string) {
  const length = Number.parseFloat(lengthInput.replace(",", "."));
  const width = Number.parseFloat(widthInput.replace(",", "."));
  if (!Number.isFinite(length) || !Number.isFinite(width) || length <= 0 || width <= 0) return null;
  return Math.round(length * width * 10) / 10;
}

export function carpetEstimateLabel(areaM2: number) {
  const minimum = 200;
  const low = Math.max(minimum, Math.ceil(areaM2 * 8));
  const high = Math.max(minimum, Math.ceil(areaM2 * 18));
  return `${formatGhs(low)}–${formatGhs(high)} estimated`;
}

export function quoteGuidance(serviceId: string, primaryValue: string, secondaryValue?: string) {
  if (serviceId === "cleaning") {
    const ranges: Record<string, string> = { "1 bedroom": "₵450–₵650", "2 bedrooms": "₵650–₵850", "3 bedrooms": "₵850–₵1,100", "4 bedrooms": "₵1,100–₵1,400", "5+ bedrooms": "From ₵1,400" };
    return ranges[primaryValue] ?? "Assessment quote";
  }
  if (serviceId === "fumigation") {
    const ranges: Record<string, string> = { Cockroaches: "₵250–₵400", Rodents: "₵300–₵500", Bedbugs: "₵500–₵1,200", Termites: "₵800–₵2,500" };
    return ranges[primaryValue] ?? "Assessment quote";
  }
  if (serviceId === "detailing") return primaryValue === "SUV" ? (secondaryValue === "Full detail" ? "From ₵220" : "From ₵60") : (secondaryValue === "Full detail" ? "From ₵180" : "From ₵45");
  if (serviceId === "polytank") return primaryValue === "Small (200L–500L)" ? "₵150" : primaryValue === "Medium (1kL–2.5kL)" ? "₵350" : "₵600";
  return "Assessment quote";
}
