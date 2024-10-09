package backend

import (
	"context"
	"fmt"
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

func (a *App) OpenWithDefaultApplication(filePath string) error {
	fmt.Printf("Opening %s with default\n", filePath)
	fileType, err := file.GetFileType(filePath)
	if err != nil {
		fmt.Println(err)
		return err
	}
	fmt.Printf("file type = %s\n", fileType)

	defaultApplication, err := file.GetAssociatedProgram(fileType)

	if err != nil {
		fmt.Println(err)
		return err
	}

	if defaultApplication == "" {
		// if no default application found it picks from the registered applications
		registeredApplications, err := file.GetRegisteredApplications(fileType)

		if err != nil {
			return err
		}

		fmt.Println(registeredApplications)
		err = file.OpenFile(registeredApplications[0], filePath)

		if err != nil {
			return err
		}
	} else {
		err := file.OpenFile(defaultApplication, filePath)

		if err != nil {
			return err
		}
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

func (a *App) ListDir(dirPath string, additionalParmas types.AdditionalParams) ([]types.FileStruct, error) {
	fileStruct, err := file.GetDirList(dirPath, file.GetDirListOptionalParam{
		IncludeDotFiles: additionalParmas.IncludeDotfiles,
	})

	if err != nil {
		fmt.Println(err)
		return fileStruct, err
	}

	if additionalParmas.Sort {
		fileStruct = file.SortFileStructByDir(fileStruct)
	}

	return fileStruct, err
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
