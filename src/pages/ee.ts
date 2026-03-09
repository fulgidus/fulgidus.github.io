// import type { APIContext } from 'astro'
import { λ } from '@/constants/easter-egg'

export async function GET(/*_context: APIContext*/) {
    return new Response(λ, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
}
