// import {type QueueAction, type QueueItem} from "@/interfaceLibrary/QueueTypes";
//
// export const queueReducer = (state: QueueItem[], action: QueueAction): QueueItem[] => {
//     switch (action.type) {
//         case 'ADD_FILES':
//             return [
//                 ...state,
//                 ...action.files.map((file): QueueItem => ({
//                     id: `${file.name}`,
//                     file,
//                     status: 'queued',
//                     progress: 0
//                 }))
//             ];
//
//         case 'UPDATE_STATUS':
//             return state.map(item =>
//                 item.id === action.id
//                     ? {...item, status: action.status}
//                     : item
//             );
//
//         case 'UPDATE_METADATA':
//             return state.map(item =>
//                 item.id === action.id
//                     ? {...item, metadata: action.metadata}
//                     : item
//             );
//
//         case 'SET_ERROR':
//             return state.map(item =>
//                 item.id === action.id
//                     ? {...item, status: 'error'}
//                     : item
//             );
//
//         case 'REMOVE_FILE':
//             return state.filter(item => item.id !== action.id);
//
//         default:
//             return state;
//     }
// }