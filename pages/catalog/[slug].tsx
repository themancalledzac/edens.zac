import PhotoBlockComponent from "../../Components/PhotoBlockComponent/PhotoBlockComponent";
import React, {useEffect, useState} from "react";
import styles from '../../styles/Catalog.module.scss';
import Header from "../../Components/Header/Header";
import {fetchCatalogBySlug} from "@/lib/api/catalogs";
import {Catalog} from "@/types/Catalog";
import {Image} from "@/types/Image";
import {chunkImages, swapImages} from "@/utils/imageUtils";
import {useAppContext} from "@/context/AppContext";
import ImageFullScreen from "@/Components/ImageFullScreen/ImageFullScreen";
import {useEditContext} from "@/context/EditContext";

interface CatalogPageProps {
    catalog: Catalog;
    imageChunks: Image[][];
}

/**
 * Photography Gallery Page.
 */
export async function getServerSideProps({params}) {

    try {
        const slug: string = params?.slug as string;
        const catalog: Catalog = await fetchCatalogBySlug(slug);

        // We can only do the chunking on the server, not the sizing
        // as sizing depends on client viewport dimensions
        const imageChunks: Image[][] = chunkImages(catalog.images, 3);

        return {
            props: {
                catalog,
                imageChunks
            },
        };
    } catch (error) {
        console.error("Fetch error: ", error);
        return {
            notFound: true
        };
    }
}

/**
 * The page component that renders the content for each title
 *
 * @param catalog Catalog data.
 * @param initialImageChunks Images from the database, in order.
 * @constructor
 */
const CatalogPage = ({catalog, imageChunks: initialImageChunks}: CatalogPageProps) => {
    const {isMobile} = useAppContext();
    const [contentWidth, setContentWidth] = useState(800);
    const {isEditMode, imageSelected, setImageSelected, selectedForSwap, setSelectedForSwap} = useEditContext();

    // Update state
    const [images, setImages] = useState<Image[]>(catalog.images || []);
    const [imageChunks, setImageChunks] = useState<Image[][]>(initialImageChunks);

    /**
     * Function to handle Image position change.
     *
     * Our current edit image position entails the following logic:
     * First image clicked will set our image as 'selectedForSwap'.
     * If we click that first image again, we unselect it.
     * If we instead click a second image, we swap images, which causes a page rerender.
     *
     * @param image Image.
     */
    const handleImageEdit = (image: Image) => {
        if (selectedForSwap === null) {
            // first image selected
            setSelectedForSwap(image);
        } else if (selectedForSwap.id === image.id) {
            setSelectedForSwap(null);
        } else {
            // second image selected, swap
            const {newImages, newChunks} = swapImages(images, selectedForSwap.id, image.id);
            setImages(newImages);
            setImageChunks(newChunks);
            setSelectedForSwap(null);
        }
    }

    /**
     * Handles an image click, either for Edit or for Full Screen.
     * @param image - Image.
     */
    const handleImageClick = (image: Image) => {
        if (isEditMode) {
            handleImageEdit(image);
        } else {
            setImageSelected(image);
        }
    };

    /**
     * Hook to handle Arrow Clicks on ImageFullScreen.
     */
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

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        }


    }, [imageChunks, imageSelected, setImageSelected]);

    /**
     * Hook to calculate component width if Mobile view changes.
     */
    useEffect(() => {
        const calculateComponentWidth = () => {
            if (isMobile) {
                return window.innerWidth - 40; // Subtract padding (10px on each side)
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

    if (!catalog) {
        return <div>Loading...</div>;
    }

    return (
        <div className={styles.catalogPageMain}>
            <Header/>

            <div className={styles.catalogContent}>
                <div
                    className={styles.catalogHeader}
                    style={isMobile ? {width: '100%'} : {width: `${contentWidth}px`, margin: '0 auto'}}
                >
                    <h1 className={`${styles.catalogTitle} ${isEditMode && styles.catalogTitleEdit}`}>{catalog.title}</h1>
                    {catalog.paragraph && (
                        <p className={`${styles.catalogDescription} ${isEditMode && styles.descriptionEdit}`}>{catalog.paragraph}</p>
                    )}
                </div>

                <div className={styles.photoBlockWrapper}>
                    {imageChunks && imageChunks.length > 0 && (
                        imageChunks.map((photoPair: Image[], index: React.Key) => (
                            <PhotoBlockComponent
                                componentWidth={contentWidth}
                                isMobile={isMobile}
                                key={index}
                                photos={photoPair}
                                handleImageClick={handleImageClick}
                                selectedForSwap={selectedForSwap}
                            />
                        )))}
                </div>
                {imageSelected && (
                    <ImageFullScreen setImageSelected={setImageSelected} imageSelected={imageSelected}/>
                )}
            </div>
        </div>
    );
};

export default CatalogPage;