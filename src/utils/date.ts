import { siteConfig } from '@/site-config'
import type { Languages } from '@/i18n/ui'

/** Maps site languages to Intl locale strings */
const localeMap: Record<string, string> = {
	en: 'en-GB',
	it: 'it-IT',
	nl: 'nl-NL',
}

function getLocale(lang?: Languages | string): string {
	if (lang && lang in localeMap) return localeMap[lang]
	return siteConfig.date.locale
}

const dateFormat = new Intl.DateTimeFormat(siteConfig.date.locale, siteConfig.date.options)

export function getFormattedDate(
	date: string | number | Date,
	optionsOrLang?: Intl.DateTimeFormatOptions | Languages | string,
	lang?: Languages | string
) {
	const resolvedLang = typeof optionsOrLang === 'string' && !(optionsOrLang as string).includes('{')
		? optionsOrLang as string
		: lang
	const resolvedOptions = typeof optionsOrLang === 'object' ? optionsOrLang : undefined
	const locale = getLocale(resolvedLang)

	if (resolvedOptions) {
		return new Date(date).toLocaleDateString(locale, {
			...(siteConfig.date.options as Intl.DateTimeFormatOptions),
			...resolvedOptions
		})
	}

	if (resolvedLang) {
		return new Date(date).toLocaleDateString(locale, siteConfig.date.options as Intl.DateTimeFormatOptions)
	}

	return dateFormat.format(new Date(date))
}

/**
 * Better DateTimeFormatOptions types
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat for representation details
 */
export interface DateTimeFormatOptions extends Intl.DateTimeFormatOptions {
    localeMatcher?: 'best fit' | 'lookup';
    weekday?: 'long' | 'short' | 'narrow';
    era?: 'long' | 'short' | 'narrow';
    year?: 'numeric' | '2-digit';
    month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
    day?: 'numeric' | '2-digit';
    hour?: 'numeric' | '2-digit';
    minute?: 'numeric' | '2-digit';
    second?: 'numeric' | '2-digit';
    timeZoneName?: 'long' | 'short';
    formatMatcher?: 'best fit' | 'basic';
    hour12?: boolean;
    /**
     * Timezone string must be one of IANA. UTC is a universally required recognizable value
     */
    timeZone?: 'UTC' | undefined;
    dateStyle?: 'full' | 'long' | 'medium' | 'short',
    timeStyle?: 'full' | 'long' | 'medium' | 'short',
    calendar?: 'buddhist' | 'chinese' | ' coptic' | 'ethiopia' | 'ethiopic' | 'gregory' | ' hebrew' | 'indian' | 'islamic' | 'iso8601' | ' japanese' | 'persian' | 'roc',
    dayPeriod?: 'narrow' | 'short' | 'long',
    numberingSystem?: 'arab' | 'arabext' | 'bali' | 'beng' | 'deva' | 'fullwide' | ' gujr' | 'guru' | 'hanidec' | 'khmr' | ' knda' | 'laoo' | 'latn' | 'limb' | 'mlym' | ' mong' | 'mymr' | 'orya' | 'tamldec' | ' telu' | 'thai' | 'tibt',
    hourCycle?: 'h11' | 'h12' | 'h23' | 'h24',
    /**
     * Warning! Partial support 
     */
    fractionalSecondDigits?: 1 | 2 | 3 | undefined
}