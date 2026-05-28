import { artifactGroups } from "./artifactGroups";
import { softwareDeliveryPages } from "./softwareDeliveryFlow";

const DEFAULT_SOFTWARE_DELIVERY_PAGE_ID = "pm_request";

export function getPageById(pageId) {
  return softwareDeliveryPages.find((page) => page.id === pageId) || null;
}

export function getPageByRouteKey(routeKey) {
  return softwareDeliveryPages.find((page) => page.routeKey === routeKey) || null;
}

export function getNextPage(pageId) {
  const page = getPageById(pageId);
  return page?.nextPage ? getPageById(page.nextPage) : null;
}

export function getPreviousPage(pageId) {
  const page = getPageById(pageId);
  return page?.previousPage ? getPageById(page.previousPage) : null;
}

export function getArtifactGroupForPage(pageId) {
  const page = getPageById(pageId);
  return page ? artifactGroups.find((group) => group.id === page.artifactGroup) || null : null;
}

export function getPageForArtifactType(artifactType) {
  const directPage = softwareDeliveryPages.find((page) => page.artifactType === artifactType);
  if (directPage) return directPage;

  const group = artifactGroups.find((item) => item.artifactTypes.includes(artifactType));
  return group ? softwareDeliveryPages.find((page) => page.artifactGroup === group.id) || null : null;
}

export function getDefaultSoftwareDeliveryPage() {
  return getPageById(DEFAULT_SOFTWARE_DELIVERY_PAGE_ID);
}

export function getVisibleSoftwareDeliveryPages() {
  return softwareDeliveryPages;
}
