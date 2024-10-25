package types

type FileStruct struct {
	FileName string
	IsDir    bool
	Perm     bool
}

type AdditionalParams struct {
	IncludeDotfiles bool
	Sort            bool
	SearchParam     string
}
