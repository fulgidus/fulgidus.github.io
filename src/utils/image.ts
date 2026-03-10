import type { ImageSize } from '@/content/config'

export function composeImageSizeClasses(size: ImageSize): string {
    const r = Math.random()
    if (size === 'xl') {
        return 'w-100%'
    }
    if (size === 'lg') {
        return 'w-100%'
    }
    if (size === 'md') {
        return `${r < 0.5 ? 'float-left mr6' : 'float-right ml6'} mb6 w-100%`
    }
    if (size === 'sm') {
        return `${r < 0.5 ? 'float-left mr4' : 'float-right ml4'} mb4 w-75%`
    }
    if (size === 'xs') {
        return `${r < 0.5 ? 'float-left mr4' : 'float-right ml4'} mb4 w-50%`
    }
    return `${r < 0.5 ? 'float-left mr6' : 'float-right ml6'} mb6 w-100%`
}
