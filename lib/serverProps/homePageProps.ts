/**
 * Server-Side props function for the homepage
 */

import {withErrorHandling} from "@/lib/serverProps/baseProps";
import {GetServerSidePropsContext} from "next";
import {fetchHomePageTemplate} from "@/lib/api/templates";
import {fetchCatalogByTitle} from "@/lib/api/catalogs";
import {fetchBlogById, fetchLatestBlog} from "@/lib/api/blogs";
import {BlogHomeItem, CatalogHomeItem} from "@/types/HomePage";

/**
 * Fetches and processes data for the homepage
 */
export const getHomePageProps = withErrorHandling(async (context: GetServerSidePropsContext) => {

    // TODO: Use context for future enhancements:
    // User authentication for admin features
    //    - const isAdmin = await validateToken(session);
    //    - const session = context.req.cookies.authToken;
    // Query params for filtering/sorting (tag, category, etc)
    //  2. Handle ?tag=landscape&sort=newest
    //    - const {slug} = context.params;
    //    - const {tag,sort} = context.query;
    //    - const template = await fetchHomePageTemplate({tag,sort});
    // User prefs, preferred categories, viewmode, dark mode
    //    - const darkMode = context.req.cookies.darkMode === 'true';
    //    - const preferredCategory = context.req.cookies.preferredCategory;
    // A/B testing different template layouts

    // Fetch the homepage template configuration
    const template = await fetchHomePageTemplate();

    // Process each item to fetch its content
    const processedItem = await Promise.all(
        template.map(async (item) => {
            switch (item.type) {
                case 'catalog': {
                    const catalogItem = item as CatalogHomeItem;
                    const content = await fetchCatalogByTitle(catalogItem.title);

                    return {
                        ...catalogItem,
                        content
                    };
                }

                case 'blog': {
                    const blogItem = item as BlogHomeItem;
                    const content = blogItem.id
                        ? await fetchBlogById(blogItem.id)
                        : await fetchLatestBlog();

                    return {
                        ...blogItem,
                        content
                    };
                }

                default:
                    return item;
            }
        })
    );

    // Return the processed item as props
    return {
        props: {
            homePageItems: processedItem
        },
    }
});