import type { DateSource, FreezerItem } from './types';

export type RotationDateType = 'use_by' | 'best_before' | 'opened' | 'estimated' | 'none';
export type RotationLevel = 'expired-use-by' | 'use-now' | 'soon' | 'stable' | 'needs-data';
export type RotationConfidence = 'confirmed' | 'estimated' | 'missing';

export type RotationAssessment = {
  level: RotationLevel;
  reason: string;
  confidence: RotationConfidence;
  dateType: RotationDateType;
  priorityDate?: string;
};

export type RotationItem = {
  item: FreezerItem;
  assessment: RotationAssessment;
};

function dayDifference(date: string, referenceDate: Date) {
  const target = new Date(`${date}T00:00:00.000Z`).getTime();
  const reference = new Date(
    `${referenceDate.toISOString().slice(0, 10)}T00:00:00.000Z`,
  ).getTime();
  return Math.round((target - reference) / 86_400_000);
}

function confidence(source: DateSource, dateType: RotationDateType): RotationConfidence {
  if (dateType === 'none') return 'missing';
  return source === 'estimated' || dateType === 'estimated' ? 'estimated' : 'confirmed';
}

function datedAssessment(
  date: string,
  dateType: Exclude<RotationDateType, 'opened' | 'none'>,
  source: DateSource,
  referenceDate: Date,
): RotationAssessment {
  const days = dayDifference(date, referenceDate);
  const resultConfidence = confidence(source, dateType);

  if (dateType === 'use_by' && days < 0) {
    return {
      level: 'expired-use-by',
      reason: 'Sista förbrukningsdag har passerat. Följ märkningen och använd inte varan.',
      confidence: resultConfidence,
      dateType,
      priorityDate: date,
    };
  }
  if (days < 0) {
    return {
      level: 'use-now',
      reason:
        dateType === 'best_before'
          ? 'Bäst före har passerat — kontrollera och bedöm varan själv.'
          : 'Uppskattat planeringsdatum har passerat — kontrollera varan själv.',
      confidence: resultConfidence,
      dateType,
      priorityDate: date,
    };
  }
  if (days <= 30) {
    const dayWord = days === 1 ? 'dag' : 'dagar';
    return {
      level: days <= 1 ? 'use-now' : 'soon',
      reason:
        dateType === 'use_by'
          ? `Sista förbrukningsdag om ${days} ${dayWord}.`
          : dateType === 'best_before'
            ? `Bäst före om ${days} ${dayWord}.`
            : `Uppskattat planeringsdatum om ${days} ${dayWord}.`,
      confidence: resultConfidence,
      dateType,
      priorityDate: date,
    };
  }
  return {
    level: 'stable',
    reason: 'Ingen tidig åtgärd behövs utifrån registrerade datum.',
    confidence: resultConfidence,
    dateType,
    priorityDate: date,
  };
}

export function assessRotation(
  item: FreezerItem,
  referenceDate = new Date(),
): RotationAssessment {
  if (item.useBy) return datedAssessment(item.useBy, 'use_by', item.dateSource, referenceDate);
  if (item.bestBefore) {
    return datedAssessment(item.bestBefore, 'best_before', item.dateSource, referenceDate);
  }
  if (item.openedOn) {
    return {
      level: 'use-now',
      reason: 'Öppnad vara — använd först och följ anvisningarna på förpackningen.',
      confidence: confidence(item.dateSource, 'opened'),
      dateType: 'opened',
      priorityDate: undefined,
    };
  }
  if (item.estimatedDate || (item.dateSource === 'estimated' && item.eatBefore)) {
    return datedAssessment(
      item.estimatedDate ?? item.eatBefore!,
      'estimated',
      'estimated',
      referenceDate,
    );
  }
  if (item.eatBefore) {
    return datedAssessment(item.eatBefore, 'best_before', item.dateSource, referenceDate);
  }
  return {
    level: 'needs-data',
    reason: 'Datum saknas. Lägg till märkningsdatum för bättre planering.',
    confidence: 'missing',
    dateType: 'none',
  };
}

const severity: Record<RotationLevel, number> = {
  'expired-use-by': 0,
  'use-now': 1,
  soon: 2,
  stable: 3,
  'needs-data': 4,
};

export function selectRotationItems(items: FreezerItem[], referenceDate = new Date()) {
  return items
    .filter((item) => item.status === 'active')
    .map<RotationItem>((item) => ({ item, assessment: assessRotation(item, referenceDate) }))
    .filter(({ assessment }) =>
      ['expired-use-by', 'use-now', 'soon'].includes(assessment.level),
    )
    .sort((left, right) => {
      const bySeverity = severity[left.assessment.level] - severity[right.assessment.level];
      if (bySeverity !== 0) return bySeverity;
      const leftDate = left.assessment.priorityDate ?? '9999-12-31';
      const rightDate = right.assessment.priorityDate ?? '9999-12-31';
      return leftDate.localeCompare(rightDate) || left.item.name.localeCompare(right.item.name, 'sv');
    });
}
