import PhotoBlockComponent from "../../Components/PhotoBlockComponent/PhotoBlockComponent";
import React, {useEffect, useMemo, useState} from "react";
import styles from '../../styles/Catalog.module.scss';
import Header from "../../Components/Header/Header";
import {fetchCatalogBySlug, updateCatalog} from "@/lib/api/catalogs";
import {Catalog} from "@/types/Catalog";
import {Image} from "@/types/Image";
import {chunkImages, swapImages} from "@/utils/imageUtils";
import {useAppContext} from "@/context/AppContext";
import ImageFullScreen from "@/Components/ImageFullScreen/ImageFullScreen";
import {useEditContext} from "@/context/EditContext";
import {UpdateToolbar} from "@/Components/EditToolbar/UpdateToolbar";

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

        // // We can only do the chunking on the server, not the sizing
        // // as sizing depends on client viewport dimensions
        // const imageChunks: Image[][] = chunkImages(catalog.images, 3);

        return {
            props: {
                catalog
                // imageChunks
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
 * TODO: Add more space above Title, feels too crowded
 *  - Verify 2 wide and pans also are still working
 *  - blog single isn't full width fyi
 *  - Need 'on click' edit paragraph. even if we have to use another component.
 *  - "Tab Enter" to accept, or, the ACCEPT button on the bottom right, next to CANCEL
 *  - Need to verify that we are changing our MAIN OBJECT's image order On Change, every change.
 *  -
 *
 * @param catalog Catalog data.
 // * @param initialImageChunks Images from the database, in order.
 * @constructor
 */
const CatalogPage = ({catalog}: CatalogPageProps) => {
    const {isMobile, currentCatalog, setCurrentCatalog} = useAppContext();
    const [contentWidth, setContentWidth] = useState(800);
    const {
        isEditMode,
        setIsEditMode,
        imageSelected,
        setImageSelected,
        selectedForSwap,
        setSelectedForSwap,
        editCatalog,
        setEditCatalog,
    } = useEditContext();

    const [isTitleEdit, setIsTitleEdit] = useState<boolean>(false);
    const [isParagraphEdit, setIsParagraphEdit] = useState<boolean>(false);
    const testParagraph = "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Amet asperiores at, cumque deleniti dignissimos ducimus error ipsa libero minima nisi obcaecati quos, repellendus repudiandae sequi sit voluptate voluptatem? Ad assumenda, autem error facilis harum non pariatur placeat qui tenetur. Accusamus aliquid deleniti eligendi labore maiores nobis placeat quas reiciendis tempore.";
    const imageChunks = useMemo(() => {
        // When editing, use editCatalog's images
        const sourceImages = isEditMode && editCatalog
            ? editCatalog?.images
            : currentCatalog?.images;
        return chunkImages(sourceImages, 3);
    }, [currentCatalog, editCatalog, isEditMode, catalog]);

    /**
     * Hook that updates current catalog on update.
     */
    useEffect(() => {
        if (catalog && (!currentCatalog || currentCatalog.id !== catalog.id)) {
            setCurrentCatalog(catalog);
        }
    }, [catalog, currentCatalog]);

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
    const handleImageSwitch = (image: Image) => {
        if (!editCatalog) return;

        if (selectedForSwap === null) {
            // first image selected
            setSelectedForSwap(image);
        } else if (selectedForSwap.id === image.id) {
            setSelectedForSwap(null);
        } else {
            // second image selected, swap
            const {newImages, newChunks} = swapImages(editCatalog.images, selectedForSwap.id, image.id);

            // Update edit catalog with new image order
            setEditCatalog({
                ...editCatalog,
                images: newImages
            })
            setSelectedForSwap(null);
        }
    }

    const handleTitleChange = (e) => {
        setEditCatalog({
            ...editCatalog,
            title: e.target.value
        })
    }

    const handleParagraphChange = (e) => {
        setEditCatalog({
            ...editCatalog,
            paragraph: e.target.value
        })
    }

    const handleSaveChanges = async () => {
        try {
            if (!editCatalog) return;

            const updatedCatalog = await updateCatalog(editCatalog);
            console.log('Before context update:', currentCatalog?.title);
            setCurrentCatalog(updatedCatalog);

            // const newImageChunks = chunkImages(updatedCatalog.images, 3);

            console.log("After context update:", currentCatalog?.title);
            setEditCatalog(null);
            setIsEditMode(false);

            setIsParagraphEdit(false);
            setIsTitleEdit(false);

        } catch (error) {
            console.error('Failed to save changes:', error);
        } finally {

            // setEditCatalog(null);
            // setIsEditMode(false);
        }
    };

    /**
     * Handles an image click, either for Edit or for Full Screen.
     * @param image - Image.
     */
    const handleImageClick = (image: Image) => {
        if (isEditMode) {
            handleImageSwitch(image);
        } else {
            setImageSelected(image);
        }
    };

    const handleImageUpload = () => {
        // TODO:
        //  - On Button Click, we need to emulate our current 'upload' page logic.
        //  - Will need to be a pop-out / Modal, OR, could simply push down all 'current' images with new images up top
        //  - Simple upload, simply select images for now
        //  - Future would be adding 'tags' or 'people' or 'location' for ALL images / individual
    }

    const handleSelectCoverImage = (image: Image) => {
        // TODO:
        //  - Set Image As Cover Image
        //  - Need a 'hover' or otherwise BUTTON to determine clicking for a cover image
        //  - Better yet would be a 'selectCoverImage' button in our 'updateToolbar', that updates 'selectImage' logic to instead select Coverimage instead.
        //  - On select of cover image, we would turn off 'isSetCoverImage' state
    }

    const handleCancelUpdate = () => {
        setEditCatalog(null);
        setIsParagraphEdit(false);
        setIsTitleEdit(false);
    }

    /**
     * Hook to handle Catalog in Update/Edit mode.
     */
    useEffect(() => {
        if (isEditMode) {
            setEditCatalog({
                ...currentCatalog,
            });
        } else {
            setEditCatalog(null);
        }
    }, [isEditMode, currentCatalog, setEditCatalog]);

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
                    {isTitleEdit ? (
                        isEditMode && (

                            <input
                                type="text"
                                value={editCatalog?.title}
                                onChange={handleTitleChange}
                                className={`${styles.catalogTitle} ${styles.catalogTitleEdit}`}
                            />
                        )
                    ) : (
                        <h1 className={`${styles.catalogTitle} ${isEditMode && styles.catalogTitleEdit}`}
                            onClick={() => isEditMode && setIsTitleEdit(!isTitleEdit)}>
                            {isEditMode && editCatalog ? editCatalog.title : (currentCatalog?.title || catalog?.title)}
                        </h1>
                    )}
                    {isParagraphEdit ? (
                        isEditMode && (
                            <input
                                type="text"
                                value={editCatalog?.paragraph}
                                onChange={handleParagraphChange}
                                className={`${styles.catalogDescription} ${styles.catalogDescriptionEdit}`}
                            />
                        )
                    ) : (
                        <p
                            onClick={() => isEditMode && setIsParagraphEdit(!isParagraphEdit)}
                            className={`${styles.catalogDescription} ${isEditMode && styles.descriptionEdit}`}
                        >
                            {currentCatalog?.paragraph ? currentCatalog?.paragraph : testParagraph}
                        </p>

                    )}
                </div>

                {isEditMode && (
                    <UpdateToolbar
                        contentWidth={contentWidth}
                        isMobile={isMobile}
                        handleCancelChanges={() => setIsEditMode(!isEditMode)}
                        handleSaveChanges={() => handleSaveChanges()}
                    />
                )}

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