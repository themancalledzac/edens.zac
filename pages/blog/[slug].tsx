// pages/blog/[slug].tsx
import {useRouter} from 'next/router';
import styles from '@/styles/Blog.module.scss';
import Header from '@/Components/Header/Header';
import Image from 'next/image';
import {GetServerSideProps} from 'next';
import {Blog} from '@/types/Blog';
import {fetchBlogBySlug} from "@/lib/api/blogs";
import {chunkImageArray} from "@/utils/imageUtils";
import {useEffect, useState} from "react";
import PhotoBlockComponent from "@/Components/PhotoBlockComponent/PhotoBlockComponent";

interface BlogPageProps {
    blog: Blog;
    imageChunks: any[];
}

export const getServerSideProps: GetServerSideProps = async ({params}) => {
    // In a real implementation, you'd fetch the blog by slug from your API
    // For now, we'll use a simple mock or fetch from the local API
    try {
        const slug = params?.slug as string;
        const blog = await fetchBlogBySlug(slug);

        const imageChunks = await chunkImageArray(blog.images, 2);

        // TODO: emulate chunkedList logic
        //  - This includes adding 'textBox' as an option INTO the chunkedList, if an Image(?) is associated/connected/has a textBox
        //  - This means that we can do a 2Card styling with a text box to break up the images

        return {
            props: {
                blog,
                imageChunks
            }
        };
    } catch (error) {
        console.error('Error fetching blog:', error);
        return {
            notFound: true
        };
    }
};

export default function BlogPage({blog, imageChunks}: BlogPageProps) {
    const router = useRouter();
    const [imageSelected, setImageSelected] = useState(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Check for mobile viewport
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    // Handle loading state
    if (router.isFallback) {
        return <div>Loading...</div>;
    }

    return (
        <div className={styles.container}>
            <Header/>
            <div className={styles.blogWrapper}>
                <div className={styles.blogHeader}>
                    <h1 className={styles.blogTitle}>{blog.title}</h1>
                    <div className={styles.blogMeta}>
                        <span className={styles.blogDate}>{blog.date}</span>
                        {blog.location && (
                            <span className={styles.blogLocation}>{blog.location}</span>
                        )}
                        <span className={styles.blogAuthor}>By {blog.author}</span>
                    </div>
                </div>
                <div className={styles.blogContent}>
                    {/* Split paragraphs by newlines */}
                    {blog.paragraph.split('\n\n').map((paragraph, index) => (
                        <p key={index} className={styles.paragraph}>{paragraph}</p>
                    ))}
                </div>

                {imageChunks && imageChunks.length > 0 && (
                    <div className={styles.blogGallery}>
                        {imageChunks.map((photoPair, index) => (
                            <PhotoBlockComponent
                                key={index}
                                photos={photoPair}
                                isMobile={isMobile}
                                imageSelected={imageSelected}
                                setImageSelected={setImageSelected}
                            />
                        ))}
                    </div>
                )}

                {blog.tags && blog.tags.length > 0 && (
                    <div className={styles.blogTags}>
                        {blog.tags.map(tag => (
                            <span key={tag} className={styles.tag}>{tag}</span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}