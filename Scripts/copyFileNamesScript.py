# import os
# import json
#
# # specify the folder path
# folder_path = '/Volumes/14TB_HDD/Photography/2019/2019 PNWER SUMMIT/Exports'
#
# file_names_exports = [f for f in os.listdir(folder_path) if os.path.isfile(os.path.join(folder_path, f))]
#
# # Export to json file
# with open('../file_names_exports.json', 'w') as json_file:
#     json.dump(file_names_exports, json_file, indent=2)
#
# print(f"Exported {len(file_names_exports)} file names to and file_names.json")
