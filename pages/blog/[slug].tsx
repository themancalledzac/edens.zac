import styles from '@/styles/Blog.module.scss';
import Header from '@/Components/Header/Header';
import {Image} from "@/types/Image";
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
        const fullBlog = await fetchBlogBySlug(slug);

        const {images, ...blog} = fullBlog;


        const imageChunks: Image[][] = await chunkImageArray(images, 2);

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
    const [imageSelected, setImageSelected] = useState(null);
    const [isMobile, setIsMobile] = useState(false);
    const [contentWidth, setContentWidth] = useState(800);

    useEffect(() => {
        // Check for mobile viewport
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    // Hook to handle Arrow Clicks on ImageFullScreen
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (imageSelected === null) return;

            const flattenedData = imageChunks.flat();
            const currentIndex = flattenedData.findIndex(img => img.id === imageSelected.id);

            if (event.key === "ArrowRight") {
                const nextIndex = (currentIndex + 1) % flattenedData.length;
                setImageSelected(flattenedData[nextIndex]);
            } else if (event.key === "ArrowLeft") {
                const prevIndex = (currentIndex - 1 + flattenedData.length) % flattenedData.length;
                setImageSelected(flattenedData[prevIndex]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        console.log({imageChunks});

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        }


    }, [imageChunks, imageSelected]);

    // Hook to calculate component width
    useEffect(() => {
        const calculateComponentWidth = () => {
            if (isMobile) {
                return window.innerWidth - 32; // Subtract padding (16px on each side)
            } else {
                return Math.min(window.innerWidth * 0.8, 1200); // 80% of window width, max 1200px
            }
        };

        setContentWidth(calculateComponentWidth());

        const handleResize = () => {
            setContentWidth(calculateComponentWidth());
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isMobile]);

    // Handle loading state
    if (!blog) {
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
                                componentWidth={contentWidth}
                                isMobile={isMobile}
                                key={index}
                                photos={photoPair}
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