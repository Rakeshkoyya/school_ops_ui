import { NextRequest, NextResponse } from 'next/server';

// API Configuration
const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8000/api/v1';

// Content types that should be treated as binary/file downloads
const BINARY_CONTENT_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/octet-stream',
  'application/pdf',
  'image/',
];

function isBinaryContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  return BINARY_CONTENT_TYPES.some(type => contentType.includes(type));
}

// Helper to forward requests to backend
async function forwardToBackend(
  request: NextRequest,
  path: string,
  method: string
) {
  const headers = new Headers();
  
  // Forward auth header
  const authHeader = request.headers.get('Authorization');
  console.log(`[API Proxy] ${method} ${path} - Auth header present: ${!!authHeader}`);
  if (authHeader) {
    headers.set('Authorization', authHeader);
  }

  // Forward project header
  const projectHeader = request.headers.get('X-Project-Id');
  if (projectHeader) {
    headers.set('X-Project-Id', projectHeader);
  }

  // Forward content-type for non-GET requests (only if it's JSON)
  const contentType = request.headers.get('Content-Type');
  if (contentType && !contentType.includes('multipart/form-data')) {
    headers.set('Content-Type', contentType);
  }

  try {
    let body: BodyInit | undefined;
    
    if (method !== 'GET' && method !== 'HEAD') {
      // Check if it's a multipart form (file upload)
      if (contentType?.includes('multipart/form-data')) {
        body = await request.arrayBuffer();
        // Don't set Content-Type for multipart - let fetch set it with boundary
        headers.delete('Content-Type');
        // Need to forward the original content-type with boundary
        if (contentType) {
          headers.set('Content-Type', contentType);
        }
      } else {
        body = await request.text();
      }
    }
    
    const url = `${BACKEND_URL}${path}${request.nextUrl.search}`;
    console.log(`[API Proxy] Forwarding to: ${url}`);

    const response = await fetch(url, {
      method,
      headers,
      body,
    });

    const responseContentType = response.headers.get('Content-Type');
    
    // Handle binary responses (file downloads)
    if (isBinaryContentType(responseContentType)) {
      const arrayBuffer = await response.arrayBuffer();
      
      const responseHeaders = new Headers();
      // Forward relevant headers
      const contentDisposition = response.headers.get('Content-Disposition');
      if (contentDisposition) {
        responseHeaders.set('Content-Disposition', contentDisposition);
      }
      if (responseContentType) {
        responseHeaders.set('Content-Type', responseContentType);
      }
      
      return new NextResponse(arrayBuffer, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    // Handle JSON responses
    try {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } catch {
      // If JSON parsing fails, return text response
      const text = await response.text();
      return new NextResponse(text, { status: response.status });
    }
  } catch (error) {
    console.error('Backend request failed:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Auth Routes
export async function POST(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/v1', '');
  return forwardToBackend(request, path, 'POST');
}

export async function GET(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/v1', '');
  return forwardToBackend(request, path, 'GET');
}

export async function PATCH(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/v1', '');
  return forwardToBackend(request, path, 'PATCH');
}

export async function PUT(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/v1', '');
  return forwardToBackend(request, path, 'PUT');
}

export async function DELETE(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/v1', '');
  return forwardToBackend(request, path, 'DELETE');
}
