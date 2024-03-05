// pages/[title].js
import fs from 'fs';
import path from 'path';
import imageDirectory from "../Images/imageDirectory.json";

import { useRouter } from 'next/router';
import PhotoBlockComponent from "../Components/PhotoBlockComponent/PhotoBlockComponent";

// Assuming you have a function to fetch photoList based on title
// This is just a placeholder, replace with your actual data fetching logic
async function fetchPhotoListByTitle( title ) {
    // TODO: Update this so it takes our 'metadata' location and returns a list of image objects for our `photoListData in 'getStaticProps'

    const photoProject = imageDirectory.find( item => item.title.toLowerCase() === title.toLowerCase() );
    console.log( photoProject );
    return photoProject ? photoProject.photoList : [];
}

async function chunkArray( photoArray, chunkSize ) {
    let result = [];
    for (let i = 0; i < photoArray.length; i += chunkSize) {
        result.push( photoArray.slice( i, i + chunkSize ) );
    }
    return result;
}

export async function getStaticPaths() {
    // Ideally, fetch your list of titles from an API or define statically
    const paths = [
        { params: { title: 'amsterdam' } },
        { params: { title: 'paris' } },
        { params: { title: 'florence' } },
        { params: { title: 'rome' } },
        { params: { title: 'vienna' } },
        // add more paths for other titles
    ];

    return { paths, fallback: false };
}

export async function getStaticProps( { params } ) {
    // Use the title to fetch or compute the necessary data for the page
    const filePath = path.join( process.cwd(), 'Images', `imageMetadata_${params.title}.json` );
    const jsonData = fs.readFileSync( filePath, 'utf8' );
    const photoDataList = JSON.parse( jsonData );
    console.log( photoDataList );
    const photoListData = await fetchPhotoListByTitle( params.title, params.metadata );
    const chunkedList = await chunkArray( photoDataList, 2 );

    return {
        props: { // Pass the fetched data to the page component as props
            data: chunkedList
        },
    };
}

// The page component that renders the content for each title
const TitlePage = ( { data } ) => {
    const router = useRouter();
    if ( router.isFallback ) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h1>{router.query.title}</h1>
            <div>
                {/*{data.map( ( photo, index ) => (*/}
                {/*    <div key={index}>*/}
                {/*        <img src={`/${photo.title}`} alt={`Photo ${index + 1}`} style={{ maxWidth: "1000px" }}/>*/}
                {/*    </div>*/}
                {/*) )}*/}
                {data.map( ( photoPair, index ) => (
                    <PhotoBlockComponent key={index} photos={photoPair}/>
                ) )}
            </div>
        </div>
    );
};

export default TitlePage;