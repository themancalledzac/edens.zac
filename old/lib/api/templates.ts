// /**
//  * API functions for template-related operations
//  */
//
//
// import { type HomePageTemplate } from '@/types/HomePage';
//
// /**
//  * Fetches the homepage template configuration
//  *
//  * @returns The home page template configuration
//  */
// export async function fetchHomePageTemplate(): Promise<HomePageTemplate> {
//
//   // This is a placeholdiner until we implement template storage
//   // In the future this would fetch from an API endpoint
//
//   // Example hardcoded template - replace with API call when ready
//   return [
//     {
//       id: 1,
//       order: 1,
//       title: 'corporate',
//       coverImage: '',
//       type: 'catalog',
//       desktopOrder: 1,
//       mobileOrder: 1,
//     },
//     {
//       id: 3,
//       order: 2,
//       title: 'First Blog',
//       coverImage: '',
//       type: 'blog',
//       desktopOrder: 3,
//       mobileOrder: 2,
//     },
//     {
//       id: 4,
//       order: 3,
//       title: 'arches',
//       coverImage: '',
//       type: 'catalog',
//       desktopOrder: 4,
//       mobileOrder: 4,
//     },
//     {
//       id: 2,
//       order: 4,
//       title: 'enchantments',
//       coverImage: '',
//       type: 'catalog',
//       desktopOrder: 2,
//       mobileOrder: 3,
//     },
//     {
//       id: 5,
//       order: 5,
//       title: 'hidden_lake',
//       coverImage: '',
//       type: 'catalog',
//       desktopOrder: 5,
//       mobileOrder: 5,
//     },
//   ];
// }