import {Blog} from "@/types/Blog";
import {FC} from "react";
import {useRouter} from "next/router";

import styles from "./BlogCard.module.scss";

interface BlogCardProps {
    blog: Blog;
}

const BlogCard: FC<BlogCardProps> = ({blog}) => {
    const router = useRouter();

    return (
        <div className={styles.blogCard}>
            <div className={styles.blogImage} style={{backgroundImage: `url(${blog.coverImageUrl}`}}>
                <div className={styles.blogBadge}>Blog</div>
            </div>
            <div className={styles.blogContent}>
                <h2 className={styles.blogTitle}>{blog.title}</h2>
                <div className={styles.blogMeta}>
                    <span className={styles.blogDate}>{blog.date}</span>
                    {blog.location && (
                        <span className={styles.blogLocation}>{blog.location}</span>
                    )}
                </div>
                <p className={styles.blogExcerpt}>{blog.paragraph}</p>
                <span className={styles.readMore}>Read More</span>
            </div>
        </div>
    )
}

export default BlogCard;