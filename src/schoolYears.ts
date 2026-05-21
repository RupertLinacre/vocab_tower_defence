import type { Difficulty, SchoolYear } from './gameTypes';

export const SCHOOL_YEAR_ORDER: SchoolYear[] = [
    'reception',
    'year1',
    'year2',
    'year3',
    'year4',
    'year5',
    'year6',
    'year6Plus',
    'year6PlusPlus',
];

export const BASE_SCHOOL_YEAR_OPTIONS: SchoolYear[] = SCHOOL_YEAR_ORDER.slice(0, SCHOOL_YEAR_ORDER.length - 3);
export const DEFAULT_BASE_SCHOOL_YEAR: SchoolYear = 'reception';

export const SCHOOL_YEAR_LABELS: Record<SchoolYear, string> = {
    reception: 'Reception',
    year1: 'Year 1',
    year2: 'Year 2',
    year3: 'Year 3',
    year4: 'Year 4',
    year5: 'Year 5',
    year6: 'Year 6',
    year6Plus: 'Year 6 Plus +',
    year6PlusPlus: 'Year 6 Plus ++',
};

const DIFFICULTY_YEAR_OFFSET: Record<Difficulty, number> = {
    easy: 0,
    medium: 1,
    hard: 2,
    veryHard: 3,
};

const SCHOOL_YEAR_COLORS: Record<SchoolYear, number> = {
    reception: 0x46df7a,
    year1: 0x52d9ff,
    year2: 0xffcf4a,
    year3: 0xff8f5a,
    year4: 0xff6f91,
    year5: 0x9f8cff,
    year6: 0x43c9a5,
    year6Plus: 0xf09b2d,
    year6PlusPlus: 0x7d8cff,
};

export function isSchoolYear(value: string | null): value is SchoolYear {
    return SCHOOL_YEAR_ORDER.includes(value as SchoolYear);
}

export function isBaseSchoolYear(value: string | null): value is SchoolYear {
    return BASE_SCHOOL_YEAR_OPTIONS.includes(value as SchoolYear);
}

export function schoolYearForDifficulty(difficulty: Difficulty, baseSchoolYear: SchoolYear): SchoolYear {
    const baseIndex = Math.max(0, SCHOOL_YEAR_ORDER.indexOf(baseSchoolYear));
    const targetIndex = Math.min(SCHOOL_YEAR_ORDER.length - 1, baseIndex + DIFFICULTY_YEAR_OFFSET[difficulty]);
    return SCHOOL_YEAR_ORDER[targetIndex];
}

export function schoolYearLabel(schoolYear: SchoolYear): string {
    return SCHOOL_YEAR_LABELS[schoolYear];
}

export function schoolYearColor(schoolYear: SchoolYear): number {
    return SCHOOL_YEAR_COLORS[schoolYear];
}