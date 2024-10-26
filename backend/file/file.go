package file

import (
	"filezzy/backend/types"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"os/user"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
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

type GetDirListOptionalParam struct {
	IncludeDotFiles bool
}

// checkPermissions helper function to check if the required permissions are present
func checkPermissions(mode fs.FileMode, mask fs.FileMode) bool {
	// For directories, we need execute permission to access
	if mode.IsDir() {
		return mode&mask&0111 != 0
	}
	// For regular files, we just need read permission
	return mode&mask&0444 != 0
}

func HasAccess(entry fs.DirEntry) (bool, error) {
	// Get file info to access detailed permissions
	info, err := entry.Info()
	if err != nil {
		return false, err
	}

	// Get the current user
	currentUser, err := user.Current()
	if err != nil {
		return false, err
	}

	// Convert user ID to integer
	uid, err := strconv.ParseUint(currentUser.Uid, 10, 32)
	if err != nil {
		return false, err
	}

	// Get file's stat information
	stat, ok := info.Sys().(*syscall.Stat_t)
	if !ok {
		return false, err
	}

	// Get primary group ID of current user
	gid, err := strconv.ParseUint(currentUser.Gid, 10, 32)
	if err != nil {
		return false, err
	}

	mode := info.Mode()

	// Check if user is owner
	if uint32(uid) == stat.Uid {
		// Check owner permissions
		return checkPermissions(mode, 0700), nil
	}

	// Check if user is in file's group
	if uint32(gid) == stat.Gid {
		// Check group permissions
		return checkPermissions(mode, 0070), nil
	}

	// Check others permissions
	return checkPermissions(mode, 0007), nil
}

func GetDirList(dirPath string, optionList GetDirListOptionalParam) ([]types.FileStruct, error) {
	// Get absolute path (i.e. from the root '/')
	absPath, err := filepath.Abs(dirPath)
	if err != nil {
		return nil, fmt.Errorf("error getting absolute path: %v", err)
	}

	_, err = os.Stat(absPath)
	if os.IsNotExist(err) {
		return nil, fmt.Errorf("path does not exist: %s", absPath)
	}

	files, err := os.ReadDir(absPath)
	if err != nil {
		fmt.Print(err)
		return nil, fmt.Errorf("no read permission for %s: %v", absPath, err)
	}

	var fileStruct []types.FileStruct

	for _, file := range files {
		var fileInfoStruct types.FileStruct
		perm, err := HasAccess(file)

		if err != nil {
			fmt.Println("Error in accessing the file")
			return []types.FileStruct{}, err
		}

		fileInfoStruct = types.FileStruct{
			FileName: file.Name(),
			IsDir:    file.IsDir(),
			Perm:     perm,
		}

		if !optionList.IncludeDotFiles {
			if file.Name()[0] != '.' {
				fileStruct = append(fileStruct, fileInfoStruct)
			}
		} else {
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
