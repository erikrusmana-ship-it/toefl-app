import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value))
        },
      },
    }
  )

  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims as { app_metadata?: { role?: string } } | undefined
  // allow a development-only test bypass via header `x-test-admin: 1`
  const isTestBypass = process.env.NODE_ENV !== 'production' && request.headers.get('x-test-admin') === '1'
  const isAdmin = isTestBypass || claims?.app_metadata?.role === 'admin'
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isLoginRoute = request.nextUrl.pathname === '/admin/login'
  const isPasswordSetupRoute = request.nextUrl.pathname === '/admin/set-password'
  const isForgotPasswordRoute = request.nextUrl.pathname === '/admin/forgot-password'
  const isPublicAdminRoute = isLoginRoute || isPasswordSetupRoute || isForgotPasswordRoute

  if (isAdminRoute && !isPublicAdminRoute && !isAdmin) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  if (isLoginRoute && isAdmin) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}
