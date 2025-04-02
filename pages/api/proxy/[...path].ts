// pages/api/proxy/[...path].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { Readable } from 'stream';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the content-type from the original request
    const contentType = req.headers['content-type'];

    // Create headers for the backend request
    const headers: HeadersInit = {
      'Content-Type': contentType || 'multipart/form-data',
      'Host': 'localhost:8080',
      'Accept': 'application/json',
    };


    // Convert the request body to a stream
    const readable = Readable.from(req);

    const requestInit: {
      headers: Record<string, string>;
      method: string;
      duplex: string;
      body: ReadableStream<any> | Blob | ArrayBufferView | ArrayBuffer | FormData | URLSearchParams | string
    } = {
      method: 'POST',
      headers,
      body: readable as unknown as BodyInit,
      duplex: 'half',
    };

    const response = await fetch('http://localhost:8080/api/v1/image/getBatchImageMetadata', requestInit);

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
}