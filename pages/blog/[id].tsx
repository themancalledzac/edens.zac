// pages/blog/[slug].tsx
import {useRouter} from 'next/router';
import styles from '@/styles/Blog.module.scss';
import Header from '@/Components/Header/Header';
import Image from 'next/image';
import {GetServerSideProps} from 'next';
import {Blog} from '@/types/Blog';
import {fetchBlogBySlug} from "@/lib/api/blogs";

interface BlogPageProps {
    blog: Blog;
}

export const getServerSideProps: GetServerSideProps = async ({params}) => {
    // In a real implementation, you'd fetch the blog by slug from your API
    // For now, we'll use a simple mock or fetch from the local API
    try {
        const id = params?.id as string;
        const blog = await fetchBlogBySlug(id);

        return {
            props: {blog}
        };
    } catch (error) {
        console.error('Error fetching blog:', error);
        return {
            notFound: true
        };
    }
};

export default function BlogPage({blog}: BlogPageProps) {
    const router = useRouter();

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

                {blog.coverImageUrl && (
                    <div className={styles.coverImageWrapper}>
                        <Image
                            src={blog.coverImageUrl}
                            alt={blog.title}
                            layout="fill"
                            objectFit="cover"
                            priority
                        />
                    </div>
                )}

                <div className={styles.blogContent}>
                    {/* Split paragraphs by newlines */}
                    {blog.paragraph.split('\n\n').map((paragraph, index) => (
                        <p key={index} className={styles.paragraph}>{paragraph}</p>
                    ))}
                </div>

                {blog.images && blog.images.length > 0 && (
                    <div className={styles.blogGallery}>
                        {blog.images.map(image => (
                            <div key={image.id} className={styles.galleryItem}>
                                <Image
                                    src={image.imageUrlWeb || `/placeholder.jpg`}
                                    alt={image.title}
                                    width={image.imageWidth}
                                    height={image.imageHeight}
                                />
                            </div>
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