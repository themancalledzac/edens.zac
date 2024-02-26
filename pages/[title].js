// pages/[title].js

import imageDirectory from "../Images/imageDirectory.json";
import { useRouter } from 'next/router';

// Assuming you have a function to fetch photoList based on title
// This is just a placeholder, replace with your actual data fetching logic
async function fetchPhotoListByTitle( title ) {

    const photoProject = imageDirectory.find( item => item.title.toLowerCase() === title.toLowerCase() );
    console.log( photoProject );
    return photoProject ? photoProject.photoList : [];
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
    const photoListData = await fetchPhotoListByTitle( params.title );

    return {
        props: {
            data: photoListData, // Pass the fetched data to the page component as props
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
                {data.map( ( photo, index ) => (
                    <div key={index}>
                        {/* Assuming you store your images in the public folder */}
                        <img src={`/${photo}`} alt={`Photo ${index + 1}`} style={{ maxWidth: "1000px" }}/>
                    </div>
                ) )}
            </div>
        </div>
    );
};

export default TitlePage;