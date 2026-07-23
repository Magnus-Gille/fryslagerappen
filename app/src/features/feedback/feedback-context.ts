export type FeedbackContext = {
  route: string;
  screen: string;
  flow?: string;
  step?: string;
};

type AppFeedbackContextInput = {
  backendEnabled: boolean;
  authLoading: boolean;
  authenticated: boolean;
  homeLoading: boolean;
  hasHome: boolean;
  pathname: string;
};

const screenLabels: Record<string, string> = {
  startup: 'Startar appen',
  authentication: 'Logga in',
  onboarding: 'Anslut till hem',
  inventory: 'Lagret',
  history: 'Historik',
  'home-settings': 'Heminställningar',
};

const stepLabels: Record<string, string> = {
  loading: 'Laddar',
  credentials: 'Inloggning',
  'create-or-join': 'Skapa eller anslut',
  overview: 'Översikt',
  'method-picker': 'Välj metod',
  'photo-capture': 'Foto',
  'voice-capture': 'Röst',
  'manual-form': 'Manuell registrering',
  'review-add': 'Kontrollera förslag',
  'review-change': 'Bekräfta ändring',
  'choose-destination': 'Välj destination',
  settings: 'Översikt',
  'storage-place-form': 'Förvaringsplats',
  'invitation-created': 'Inbjudningskod',
};

const flowLabels: Record<string, string> = {
  'add-item': 'Lägg till vara',
  'move-item': 'Flytta vara',
  'home-settings': 'Heminställningar',
};

export function appFeedbackContext(input: AppFeedbackContextInput): FeedbackContext {
  const route = input.pathname.split(/[?#]/, 1)[0] || '/';
  if (input.backendEnabled && input.authLoading) {
    return { route, screen: 'startup', flow: 'app-start', step: 'loading' };
  }
  if (input.backendEnabled && !input.authenticated) {
    return { route, screen: 'authentication', flow: 'sign-in', step: 'credentials' };
  }
  if (input.backendEnabled && input.homeLoading) {
    return { route, screen: 'onboarding', flow: 'home', step: 'loading' };
  }
  if (input.backendEnabled && !input.hasHome) {
    return { route, screen: 'onboarding', flow: 'home', step: 'create-or-join' };
  }
  if (route === '/explore') {
    return { route, screen: 'history', flow: 'inventory-history', step: 'overview' };
  }
  return { route, screen: 'inventory', flow: 'inventory', step: 'overview' };
}

export function addItemFeedbackContext(
  mode: 'photo' | 'voice' | 'manual' | null,
  intentAction: string | null,
): FeedbackContext {
  let step = 'method-picker';
  if (intentAction) step = intentAction === 'add' ? 'review-add' : 'review-change';
  else if (mode === 'photo') step = 'photo-capture';
  else if (mode === 'voice') step = 'voice-capture';
  else if (mode === 'manual') step = 'manual-form';
  return { route: '/', screen: 'inventory', flow: 'add-item', step };
}

export function feedbackContextLabel(context: FeedbackContext) {
  const screen = flowLabels[context.flow ?? ''] ?? screenLabels[context.screen] ?? context.screen;
  const step = context.step ? (stepLabels[context.step] ?? context.step) : '';
  return step && step !== screen ? `${screen} · ${step}` : screen;
}
