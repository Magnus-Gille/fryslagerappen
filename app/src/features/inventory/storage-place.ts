import type { StoragePlace, StorageType } from './types';

export const storageTypeOptions: { value: StorageType; label: string; icon: string }[] = [
  { value: 'freezer', label: 'Frys', icon: '❄️' },
  { value: 'fridge', label: 'Kyl', icon: '🧊' },
  { value: 'dry', label: 'Torrförråd', icon: '📦' },
];

export function storageTypeDetails(storageType: StorageType) {
  return storageTypeOptions.find((option) => option.value === storageType) ?? storageTypeOptions[2];
}

export function storagePlaceLabel(place: StoragePlace) {
  return `${storageTypeDetails(place.storageType).icon} ${place.name}`;
}
