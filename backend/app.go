package backend

import (
	"context"
	"fmt"
	"io"
	"runtime"
	"strings"

	"filezzy/backend/file"
	"filezzy/backend/types"
	"os"
	"os/exec"

	"github.com/lithammer/fuzzysearch/fuzzy"
)

type App struct {
	ctx context.Context
}

func NewApp() *App {
	return &App{}
}

func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
}

func (a App) DomReady(ctx context.Context) {}

func (a *App) BeforeClose(ctx context.Context) (prevent bool) {
	return false
}

func (a *App) Shutdown(ctx context.Context) {}

func (a *App) OpenWithDefaultApplication(filePath string, selectedFile types.FileStruct) error {
	if selectedFile.IsDir {
		return fmt.Errorf("Can not open a directory")
	}
	var cmd *exec.Cmd

	switch runtime.GOOS {
	case "darwin": // macOS
		cmd = exec.Command("open", filePath)
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", "", filePath)
	case "linux":
		cmd = exec.Command("xdg-open", filePath)
	default:
		return fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
	}

	err := cmd.Start()
	if err != nil {
		return fmt.Errorf("failed to open file: %v", err)
	}

	return nil
}

func (a *App) OpenFileInVSCode(filePath string) {
	fmt.Printf("opening %s in vs code text ...\n", filePath)
	cmd := exec.Command("/bin/bash", "-c", fmt.Sprintf("code '%s'", filePath))
	stdout, err := cmd.Output()

	if err != nil {
		fmt.Println(err)
	}
	fmt.Println(stdout)
}

func (a *App) OpenFileInSublimeText(filePath string) {
	fmt.Printf("opening %s in sublime text ...\n", filePath)
	cmd := exec.Command("/bin/bash", "-c", fmt.Sprintf("subl '%s'", filePath))
	stdout, err := cmd.Output()

	if err != nil {
		fmt.Println(err)
	}
	fmt.Println(stdout)
}

func (a *App) OpenPdfInXDG(filePath string) {
	fmt.Printf("opening %s in xdg pdf viewer ...\n", filePath)
	cmd := exec.Command("/bin/bash", "-c", fmt.Sprintf("xdg-open '%s'", filePath))
	stdout, err := cmd.Output()

	if err != nil {
		fmt.Println(err)
	}
	fmt.Println(stdout)
}

func (a *App) OpenImageInFeh(filePath string) {
	fmt.Printf("opening %s in feh image viewer ...\n", filePath)
	cmd := exec.Command("/bin/bash", "-c", fmt.Sprintf("feh '%s'", filePath))
	stdout, err := cmd.Output()

	if err != nil {
		fmt.Println(err)
	}
	fmt.Println(stdout)
}

func (a *App) RemoveFile(dirPath string) error {
	err := os.RemoveAll(dirPath)
	if err != nil {
		fmt.Println(err)
	}
	return err
}

func (a *App) CreateDir(dirPath string) error {
	err := os.Mkdir(dirPath, os.ModePerm)
	if err != nil {
		fmt.Println(err)
	}
	return err
}

func (a *App) CreateFile(filePath string) error {
	f, err := os.Create(filePath)
	if err != nil {
		fmt.Println(err)
	}
	f.Close()
	return err
}

func (a *App) ListDir(
	dirPath string,
	additionalParmas types.AdditionalParams,
) ([]types.FileStruct, error) {
	fmt.Println("fetching dir list")
	fileStruct, err := file.GetDirList(dirPath, file.GetDirListOptionalParam{
		IncludeDotFiles: additionalParmas.IncludeDotfiles,
	})

	fmt.Println(fileStruct)

	if err != nil {
		return nil, err
	}

	if additionalParmas.Sort {
		fileStruct = file.SortFileStructByDir(fileStruct)
	}

	if additionalParmas.SearchParam != "" {

	}

	return fileStruct, nil
}

func (a *App) GetUserHomeDir() (string, error) {
	dirname, err := os.UserHomeDir()
	if err != nil {
		fmt.Println("Failed to get the home dir")
		fmt.Print(err)
	}
	return dirname, err
}

func (a *App) FuzzyFindFiles(targetString string, dirPath string) ([]types.FileStruct, error) {
	m := map[string]types.FileStruct{}
	targetString = strings.ToLower(targetString)
	findList, err := file.GetDirList(dirPath, file.GetDirListOptionalParam{
		IncludeDotFiles: false,
	})

	if err != nil {
		return []types.FileStruct{}, err
	}

	var fileNames []string

	for _, f := range findList {
		fileNames = append(fileNames, strings.ToLower(f.FileName))
		m[strings.ToLower(f.FileName)] = f
	}

	matchedStrings := fuzzy.Find(targetString, fileNames)
	fmt.Println(matchedStrings)
	var matchedFileStructs []types.FileStruct

	for _, matchedString := range matchedStrings {
		matchedFileStructs = append(matchedFileStructs, m[matchedString])
	}

	return matchedFileStructs, nil
}

func (a *App) RenameFile(oldName string, newName string) error {
	err := os.Rename(oldName, newName)

	if err != nil {
		return err
	}

	return nil
}

func (a *App) SearchFiles(currentDirectory, searchParam string) ([]types.FileStruct, error) {
	var matches []types.FileStruct

	fmt.Println("searching files...")

	// Read directory entries
	entries, err := os.ReadDir(currentDirectory)
	if err != nil {
		return nil, fmt.Errorf("error reading directory: %v", err)
	}

	// Iterate through directory entries
	for _, entry := range entries {
		if strings.Contains(strings.ToLower(entry.Name()), strings.ToLower(searchParam)) {
			// if !includeDotFiles && entry.Name()[0] != '.' {
			perm, err := file.HasAccess(entry)

			if err != nil {
				fmt.Println("Failed to fetch permssions of ", entry.Name())
			}

			matches = append(matches, types.FileStruct{
				FileName: entry.Name(),
				IsDir:    entry.IsDir(),
				Perm:     perm,
			})
			// }
		}
	}

	return matches, nil
}

func (a *App) CopyFile(src, dst string) (int64, error) {
	sourceFileStat, err := os.Stat(src)
	if err != nil {
		return 0, err
	}

	if !sourceFileStat.Mode().IsRegular() {
		return 0, fmt.Errorf("%s is not a regular file", src)
	}

	source, err := os.Open(src)
	if err != nil {
		return 0, err
	}
	defer source.Close()

	destination, err := os.Create(dst)
	if err != nil {
		return 0, err
	}
	defer destination.Close()
	nBytes, err := io.Copy(destination, source)
	return nBytes, err
}

func (a *App) DeleteFile(filePath string) error {
	err := os.RemoveAll(filePath)
	fmt.Println("deleting file: ", filePath)
	if err != nil {
		fmt.Println(err)
	}
	return err
}
