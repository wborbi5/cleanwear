// ============================================================
// CleanWear Analytics — PostHog Event Tracking
// ============================================================
// All events flow through here for consistency.
// PostHog is loaded via script tag in index.html.
// If PostHog isn't loaded (ad blockers, etc), calls silently no-op.

const ph = () => window.posthog;

// ---- Identity & Properties ----

export function setUserProps(props) {
  ph()?.setPersonProperties(props);
}

// Call after wardrobe changes to keep user profile current
export function syncWardrobeProfile(wardrobe) {
  if (!wardrobe?.length) return;
  const avg = Math.round(wardrobe.reduce((s, i) => s + i.score, 0) / wardrobe.length);
  const highRisk = wardrobe.filter(w => w.score < 40).length;
  setUserProps({
    wardrobe_size: wardrobe.length,
    wardrobe_avg_score: avg,
    wardrobe_high_risk_count: highRisk,
    last_scan_date: new Date().toISOString(),
  });
}

// ---- Navigation ----

export function trackTabSwitch(tab, prevTab) {
  ph()?.capture('tab_switched', { tab, previous_tab: prevTab });
}

export function trackScanModeChange(mode) {
  ph()?.capture('scan_mode_changed', { mode });
}

// ---- Scan Funnel ----

export function trackScanStarted(query, isBarcode, source) {
  ph()?.capture('scan_started', {
    query,
    is_barcode: isBarcode,
    source, // 'search', 'barcode', 'camera', 'quick_scan', 'explore', 'wardrobe_rescan', 'fabric_detective', 'alternative'
  });
}

export function trackScanCompleted(query, score, brand, product, category) {
  ph()?.capture('scan_completed', {
    query,
    score,
    brand,
    product,
    category,
    score_band: score >= 75 ? 'safe' : score >= 50 ? 'moderate' : score >= 35 ? 'poor' : 'high_risk',
  });
}

export function trackScanFailed(query, error) {
  ph()?.capture('scan_failed', { query, error });
}

// ---- Camera ----

export function trackCameraStarted() {
  ph()?.capture('camera_started');
}

export function trackCameraFailed(reason) {
  ph()?.capture('camera_failed', { reason });
}

export function trackBarcodeDetected(barcode) {
  ph()?.capture('barcode_detected', { barcode_length: barcode?.length });
}

// ---- Quick Scans ----

export function trackQuickScan(item) {
  ph()?.capture('quick_scan_clicked', { item });
}

// ---- Fabric Detective ----

export function trackFabricDetectiveStarted() {
  ph()?.capture('fabric_detective_started');
}

export function trackFabricDetectiveStepCompleted(stepId, stepNumber, answer) {
  ph()?.capture('fabric_detective_step', { step_id: stepId, step_number: stepNumber, answer });
}

export function trackFabricDetectiveCompleted(result) {
  ph()?.capture('fabric_detective_completed', {
    predicted_material: result.primary,
    confidence: result.conf,
    safety_score: result.safety,
    has_spandex: result.spandex,
  });
}

export function trackFabricDetectiveFullAnalysis() {
  ph()?.capture('fabric_detective_full_analysis');
}

// ---- Results Page ----

export function trackResultsSectionExpanded(section, productName) {
  ph()?.capture('results_section_expanded', { section, product: productName });
}

export function trackAlternativeClicked(alternativeName, alternativeBrand, fromProduct) {
  ph()?.capture('alternative_clicked', {
    alternative_name: alternativeName,
    alternative_brand: alternativeBrand,
    from_product: fromProduct,
  });
}

// ---- Wardrobe ----

export function trackWardrobeAdd(product, brand, score) {
  ph()?.capture('wardrobe_item_added', { product, brand, score });
}

export function trackWardrobeRemove(product, brand, score) {
  ph()?.capture('wardrobe_item_removed', { product, brand, score });
}

// ---- Explore ----

export function trackExploreSearch(query) {
  ph()?.capture('explore_searched', { query });
}

export function trackExploreCategoryFilter(category) {
  ph()?.capture('explore_category_filtered', { category });
}

export function trackExploreItemClicked(item, brand, score) {
  ph()?.capture('explore_item_clicked', { item, brand, score });
}

// ---- Learn ----

export function trackChemicalReferenceExpanded(chemical) {
  ph()?.capture('chemical_reference_expanded', { chemical });
}
