const allPublicPackages = [
  'packages/chat-provider',
  'packages/chat-overlay',
];

export const packageSets = {
  provider: ['packages/chat-provider'],
  overlay: ['packages/chat-provider', 'packages/chat-overlay'],
  all: allPublicPackages,
};

export function listPackageSetNames() {
  return Object.keys(packageSets);
}

export function getPackageSet(packageSetName) {
  const packageSet = packageSets[packageSetName];
  if (!packageSet) {
    throw new Error(
      `Unknown package set "${packageSetName}". Expected one of: ${listPackageSetNames().join(', ')}`,
    );
  }

  return [...packageSet];
}
