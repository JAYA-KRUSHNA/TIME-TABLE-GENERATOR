import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'optischedule-secret-key-2024-hackathon');

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // Public routes — no auth needed
    const publicRoutes = ['/', '/select-role', '/auth', '/api'];
    const isPublic = publicRoutes.some(r => pathname === r || pathname.startsWith(`${r}/`));
    if (isPublic) return NextResponse.next();

    // Check JWT token
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
        return NextResponse.redirect(new URL('/select-role', request.url));
    }

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const role = payload.role as string;

        // Role-based protection
        if (pathname.startsWith('/student') && role !== 'student') {
            return NextResponse.redirect(new URL('/select-role', request.url));
        }
        if (pathname.startsWith('/faculty') && role !== 'faculty') {
            return NextResponse.redirect(new URL('/select-role', request.url));
        }
        if (pathname.startsWith('/admin') && role !== 'admin' && role !== 'superadmin') {
            return NextResponse.redirect(new URL('/select-role', request.url));
        }
    } catch {
        // Invalid token
        const response = NextResponse.redirect(new URL('/select-role', request.url));
        response.cookies.delete('auth-token');
        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
