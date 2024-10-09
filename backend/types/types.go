package types

type FileStruct struct {
	FileName string
	IsDir    bool
}

type AdditionalParams struct {
	IncludeDotfiles bool
	Sort            bool
}
