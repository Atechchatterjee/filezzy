package file

import (
	"filezzy/backend/types"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// sorts the file structs keeping the order - directories followed by regular files or visa-versa
func SortFileStructByDir(fileStructs []types.FileStruct) []types.FileStruct {
	var directories, regularFiles []types.FileStruct

	for _, fileStruct := range fileStructs {
		if fileStruct.IsDir {
			directories = append(directories, fileStruct)
		} else {
			regularFiles = append(regularFiles, fileStruct)
		}
	}

	return append(directories, regularFiles...)
}

func RemoveDotfiles(fileStructs []types.FileStruct) []types.FileStruct {
	var fileStructsWithoutDotfiles []types.FileStruct

	for _, fileStruct := range fileStructs {
		if fileStruct.FileName[0] != '.' {
			fileStructsWithoutDotfiles = append(fileStructsWithoutDotfiles, fileStruct)
		}
	}

	return fileStructsWithoutDotfiles
}

func ReadDirWithPermissionCheck(path string) ([]fs.DirEntry, error) {
	// Get absolute path
	absPath, err := filepath.Abs(path)
	if err != nil {
		return nil, fmt.Errorf("error getting absolute path: %v", err)
	}

	// Check if the path exists
	_, err = os.Stat(absPath)
	if os.IsNotExist(err) {
		return nil, fmt.Errorf("path does not exist: %s", absPath)
	}

	// Check read permission
	files, err := os.ReadDir(absPath)
	if err != nil {
		fmt.Print(err)
		return nil, fmt.Errorf("no read permission for %s: %v", absPath, err)
	}

	return files, nil
}

type GetDirListOptionalParam struct {
	IncludeDotFiles bool
}

func GetDirList(dirPath string, optionList GetDirListOptionalParam) ([]types.FileStruct, error) {
	files, err := ReadDirWithPermissionCheck(dirPath)

	var fileStruct []types.FileStruct

	if err != nil {
		return []types.FileStruct{}, err
	}

	for _, file := range files {
		var fileInfoStruct types.FileStruct
		if !optionList.IncludeDotFiles {
			if file.Name()[0] != '.' {
				fileInfoStruct = types.FileStruct{
					FileName: file.Name(),
					IsDir:    file.IsDir(),
				}
				fileStruct = append(fileStruct, fileInfoStruct)
			}
		} else {
			fileInfoStruct = types.FileStruct{
				FileName: file.Name(),
				IsDir:    file.IsDir(),
			}
			fileStruct = append(fileStruct, fileInfoStruct)
		}
	}

	return fileStruct, nil
}

func GetFileType(filePath string) (string, error) {
	out, err := exec.Command("xdg-mime", "query", "filetype", filePath).Output()
	if err != nil {
		return "", err
	}

	return strings.TrimSpace(string(out)), nil
}

func GetAssociatedProgram(filePath string) (string, error) {
	out, err := exec.Command("xdg-mime", "query", "default", filePath).Output()
	if err != nil {
		return "", err
	}

	return strings.TrimSpace(string(out)), nil
}

func OpenFile(application string, filePath string) error {
	_, err := exec.Command("/bin/bash", "-c", fmt.Sprintf("gtk-launch %s '%s'", application, filePath)).Output()

	if err != nil {
		fmt.Println(err)
		return err
	}

	return nil
}

func GetRegisteredApplications(fileType string) ([]string, error) {
	out, err := exec.Command("gio", "mime", fileType).Output()

	if err != nil {
		fmt.Println(err)
	}

	// parsing each line to extract the registered application for given mime type
	lines := strings.Split(string(out), "\n")
	var registeredApplications []string

	for i, line := range lines {
		if i > 1 {
			trimmedLine := strings.TrimSpace(line)
			if trimmedLine == "No recommended applications" ||
				trimmedLine == "Recommeneded applications:" {
				break
			}
			registeredApplications = append(registeredApplications, trimmedLine)
		}
	}

	return registeredApplications, err
}
