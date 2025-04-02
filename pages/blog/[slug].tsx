import { GetServerSideProps } from 'next';
import React, { useEffect, useState } from 'react';

import Header from '@/Components/Header/Header';
import ImageFullScreen from '@/Components/ImageFullScreen/ImageFullScreen';
import PhotoBlockComponent from '@/Components/PhotoBlockComponent/PhotoBlockComponent';
import { useEditContext } from '@/context/EditContext';
import { fetchBlogBySlug } from '@/lib/api/blogs';
import styles from '@/styles/Blog.module.scss';
import { Blog } from '@/types/Blog';
import { Image } from '@/types/Image';
import { chunkImages } from '@/utils/imageUtils';

interface BlogPageProps {
  blog: Blog;
  imageChunks: any[];
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  // In a real implementation, you'd fetch the blog by slug from your API
  // For now, we'll use a simple mock or fetch from the local API
  try {
    const slug = params?.slug as string;
    const fullBlog = await fetchBlogBySlug(slug);

    const { images, ...blog } = fullBlog;


    const imageChunks: Image[][] = chunkImages(images, 3);

    // TODO: emulate chunkedList logic
    //  - This includes adding 'textBox' as an option INTO the chunkedList, if an Image(?)
    //  is associated/connected/has a textBox
    //  - This means that we can do a 2Card styling with a text box to break up the images

    return {
      props: {
        blog,
        imageChunks,
      },
    };
  } catch (error) {
    console.error('Error fetching blog:', error);
    return {
      notFound: true,
    };
  }
};

export default function BlogPage({ blog, imageChunks }: BlogPageProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [contentWidth, setContentWidth] = useState(800);
  const { isEditMode, imageSelected, setImageSelected } = useEditContext();

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

      if (event.key === 'ArrowRight') {
        const nextIndex = (currentIndex + 1) % flattenedData.length;
        setImageSelected(flattenedData[nextIndex]);
      } else if (event.key === 'ArrowLeft') {
        const prevIndex = (currentIndex - 1 + flattenedData.length) % flattenedData.length;
        setImageSelected(flattenedData[prevIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    console.log({ imageChunks });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };


  }, [imageChunks, imageSelected]);

  // Hook to calculate component width
  useEffect(() => {
    const calculateComponentWidth = () => {
      return isMobile ? window.innerWidth - 32 : Math.min(window.innerWidth * 0.8, 1200);
    };

    setContentWidth(calculateComponentWidth());

    const handleResize = () => {
      setContentWidth(calculateComponentWidth());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  // TODO: Determine if we can throw this in imageUrils
  // const handleImageEdit = (image: Image) => {
  //     if (selectedForSwap === null) {
  //         // first image selected
  //         setSelectedForSwap(image);
  //     } else if (selectedForSwap.id === image.id) {
  //         setSelectedForSwap(null);
  //     } else {
  //         // second image selected, swap
  //         const {newImages, newChunks} = swapImages(images, selectedForSwap.id, image.id);
  //         // swapImages(selectedForSwap.id, image.id);
  //         setImages(newImages);
  //         setImageChunks(newChunks);
  //         setSelectedForSwap(null);
  //     }
  // }

  const handleImageClick = (image: Image) => {
    if (isEditMode) {
      // TODO
      // handleImageEdit(image);
    } else {
      setImageSelected(image);
    }
  };

  // Handle loading state
  if (!blog) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <Header />
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
            {imageChunks.map((photoPair) => (
              <PhotoBlockComponent
                componentWidth={contentWidth}
                isMobile={isMobile}
                photos={photoPair}
                handleImageClick={handleImageClick}
                selectedForSwap={undefined} />
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
        {imageSelected && (
          <ImageFullScreen setImageSelected={setImageSelected} imageSelected={imageSelected} />
        )}
      </div>
    </div>
  );
}