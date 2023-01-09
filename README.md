This is a [Next.js](https://nextjs.org/) project bootstrapped
with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed
on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited
in `pages/api/hello.js`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated
as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

## TODO List

This will be a multi tier project, based on a few milestones, initially based on a simple frontend application for
viewing/showing off photography. We want an easily navigable page that helps visitors quickly view images, both
highlights presented, but also images they would like to view.

For example, this may, on page load, display a 'top images' subsection, or other sections hand picked for visitors.
However, maybe later on we want to include the ability to search for, or select pre-selected search options.... such
as 'outdoors', 'portrait', 'Scotland', 'PNWER', 'Big Sky' and more. We want the user to quickly and easily be able to
view what they want to see.

- FrontEnd Application ( Client )
    - We need a functional Application that fulfils two objectives, Photography and Coding. Iniitally we only will care
      or work on the Photography side of things. This will be a full stack application, and as such the Front End (
      Client ) will be required to make DB calls for Image data, and will need to have that data able to be re-sorted,
      searched, queried, created, and modified.
    - Pages:
        - Front Page is a landing page for the user to choose one or the other.
            - Background Image, no scrolling, no header/footer, no menu bar, just two options to click.
            - Both options can include a slight opacity/saturation change on hover.
        - Photography Page is a landing page for our different photo pages, or different search results.
            - This page will have a header bar with options for Landing bar, instagram link, search bar, etc
            - We can have two routes to go by, one being separate photo pages ( like we currently have... ), the second
              being a single landing page that changes based on user input.
            - Multiple Photo pages Option #1:
                - Our home page simply has sections to click to open further specific photo pages. These would be easy
                  to build, and be pre-built.
                - Pages in this would include things like:
                    - Portrait, Landscape, Corporate/Events,
            - Single Page Application Option #2:
                - This would be a single landing page with an evolving body.
                - We could have a few pre-selected photo search options as buttons up top, but also can search based on
                  metadata:
                    - We can take some inspiration from the Book Search application of old.
                - Searches could include:
                    - 'portrait', 'new york city', 'scotland', 'big sky', 'pnwer', 'family', 'coast', etc etc....
                - This single page could allow for a few landscape scrolling sections where we could have a few 'sample'
                  searches
            - I would LOVE A BLOG PAGE
                - A BLOG would allow us to have 'recent activity', or, 'check out this event I photographed.'
    - Future Implementation
        - Auth0 implementation
            - We want the ability to LOG IN (maybe from a hidden url, like: zacedens.com/login)
        - Upload Page
            - An upload page would allow us to connect to our Backend Service, allowing for uploading from the web
            - Upload page would need to include metadata boxes, on image upload, we would initially scrape metadata from
              the image if possible, and fill in sections of the data boxes.
            - Other things like TAGS would need to be filled out, so that new images are properly sorted.
        - Edit Image Page
            - This would allow us to ADD tags, or modify image in some other way. Right now, simply adding/removing tags
              would be our best use case.
            -
- Backend Application ( SERVER )
    - This Backend application ( server ) is where we will store our Database calls. We have plenty of examples of other
      projects querying the DB through a separate, backend application. Our S3 Bucket and DynamoDB should be Private to
      ALL but our Server. Our server, with an Auth0 implementation, will only be accessible from our Frontend
      Application ( Client ).
    - One of the main things we need to do is get a system going that allows for uploading an image (or batch uploading)
      from a local machine to AWS. We have a bit of backend business logic that needs to take place between selecting an
      image, and hitting upload. An image should contain metadata tags, either on lightroom export, or on upload.
      Initially we will probably need to build a super simple frontend for this application to allow for the uploading.
    - Tech to be used:
        - Java ( latest ), Spring Framework, AWS DynamoDB, AWS S3 Bucket storage
    - Business Logic on image Select -> Upload:
        - Assign Image a UUID.
        - Pull any EXIF tags, if any exist.
        - Pull any tags we specify on upload. ( This will need to be a frontend application part, where we can add tags
          one at a time ).
            - These tags should be pushed into an Array/List on Upload
        - Upload Image to AWS S3 Bucket 'edens.zac.photos', and save that image location for user later on.
        - Future improvement to this would be the ability to upload an images RAW file to S3 Glacier, also grabbing it's
          location for later use.
        - Future Improvement could upload a full size image, and then also resize, and reupload multiple variants of
          that image.
            - For Instance: Full Size image ( 18MB, 6kx4k_pixels ), (1080 compressed size), (480 super compressed size)
              , (square 500x500pixel).
            - Each of these variants of the image would have their own location, all saved to that UUID.
        - Upload to DynamoDB a document as follows:
            - UUID, S3 Bucket Location(s), Tag Array(could be blank? but prefer not), date, Aperture, Shutter Speed,
              ISO, Location, Color/BW,
            - We should probably verify that at least 1 TAG exists
    - Future Logic would allow for us to PULL down images, and update/add Tags/metadata at will. (PUT method obvs)
        - This would really allow us to UPLOAD now FIX later.
    -

## Milestone Order

- Milestone 1:
    - Get a body of photography that we can work with
        - MVP would include Steph Wedding pics, PNWER pics, family pics, and maybe a few backpacking trips exported.
    - We need to get a solid 100-200 images. best of the best from a few different time periods.
- Milestone 2:
    - AWS S3 bucket
        - Images uploaded here for storage.
        - Will need to work out how to access images in a secure manner.
        - Right now, we will need to upload manually to AWS. We will have easy access to image locations, and can use
          that later in our building of our Database
- Milestone 3:
    - FrontEnd application in a bare state. Let's start with:
        - Landing Page ( as seen above )
        - Photo Page
            - Data can be based on a few local images like before, including mock db.
            - ( as above )
            - Let's start with Header, Footer, Body contains:
                - List of Photo groupings ( start with Event, Outdoor, Portrait )
- Milestone 4:
    - Backend Application time!
        - Let's start by building a SPRING gateway server
        - Keep it simple
        - Let's start simply with a few routes
            - getAllImages
            - getAllImagesByCategory
            - getImage
            - getImagesByTag
    - Database Build
        - AWS DynamoDB
- Milestone 5:
    - Frontend:
        - Move our logic from using static images to utilizing our Server DB connection.
        - Right now let's just utilize the logic we are already doing here but with our server.
            - aka, getSection, or getLayout, or getActivity, or something like that.
- Milestone 6:
    - Auth0 logic added
    - New page, which requires an AUTH0 login
        - Dev Page ( last, once photos are accessible from DB )
- Milestone 7:
    - Dev Page Logic
    - We want an Upload ability, and an Edit ability
    - Upload will require a certain number of data-points from an Image
    - We will select an image from local Storage, which will need to:
    - Read EXIF metadata from image, and add it the page, helping fill out our required 'Image Data' portion
    - This is important because when uploading a new image, we need to make sure certain data exists, as stated above.
    - 
