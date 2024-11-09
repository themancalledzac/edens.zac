import {isLocalEnvironment} from "@/utils/environment";

export async function getServerSideProps() {
    if (!isLocalEnvironment()) {
        return {
            redirect: {
                destination: '/',
                permanent: false,
            },
        };
    }

    return {
        props: {}
    }
}