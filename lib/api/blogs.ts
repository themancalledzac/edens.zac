/**
 * API functions for blog-related operations
 */

import {Blog} from "@/types/Blog";
import {fetchFromApi} from "@/lib/api/core";

/**
 * Fetches the latest blog post
 *
 * @returns The latest blog post data
 */
export async function fetchLatestBlog(): Promise<Blog> {
    try {
        const blogs = await fetchFromApi<Blog[]>('/blog/getAll?page=0&size=1');

        if (blogs && blogs.length > 0) {
            return blogs[0];
        }

        throw new Error('No blogs found');
    } catch (error) {
        console.error('Error fetching latest blog:', error);

        // Fallback
        return {
            id: 3,
            title: '',
            date: '',
            location: '',
            paragraph: '',
            images: [],
            author: '',
            tags: [],
            coverImageUrl: '',
            slug: ''
        }
    }
}

/**
 * Fetches a specific blog by ID
 *
 * @param id - The blog id
 * @returns The blog data
 */
export async function fetchBlogById(id: number): Promise<Blog> {
    return fetchFromApi<Blog>(`/blog/${id}`);
}
