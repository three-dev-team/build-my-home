# IntelliJ IDEA 포매팅 설정 가이드

## 1. EditorConfig 플러그인 활성화

1. **File** → **Settings** (또는 `Ctrl + Alt + S`)
2. **Plugins** → **EditorConfig** 검색
3. **EditorConfig** 플러그인이 설치되어 있고 활성화되어 있는지 확인
   - 없으면 설치 후 IntelliJ 재시작

## 2. EditorConfig 자동 적용 설정

1. **File** → **Settings** → **Editor** → **Code Style**
2. 우측 상단의 **"Enable EditorConfig support"** 체크박스 활성화
3. **Apply** 클릭

이제 `.editorconfig` 파일의 설정이 자동으로 적용됩니다.

## 3. Java 코드 스타일 설정

1. **File** → **Settings** → **Editor** → **Code Style** → **Java**
2. **Tabs and Indents** 탭:
   - **Tab size**: `4`
   - **Indent**: `4`
   - **Continuation indent**: `8`
   - **Use tab character**: 체크 해제 (스페이스 사용)
3. **Wrapping and Braces** 탭:
   - **Hard wrap at**: `120`
4. **Apply** 클릭

## 4. JavaScript/JSX 코드 스타일 설정

1. **File** → **Settings** → **Editor** → **Code Style** → **JavaScript**
2. **Tabs and Indents** 탭:
   - **Tab size**: `2`
   - **Indent**: `2`
   - **Use tab character**: 체크 해제 (스페이스 사용)
3. **Wrapping and Braces** 탭:
   - **Hard wrap at**: `120`
4. **Apply** 클릭

## 5. Prettier 설정 (프론트엔드)

1. **File** → **Settings** → **Plugins**
2. **Prettier** 플러그인 설치 (없는 경우)
3. **File** → **Settings** → **Languages & Frameworks** → **JavaScript** → **Prettier**
4. **Prettier package**: `frontend/node_modules/prettier` 경로 지정
5. **Run for files**: `{**/*,*}.{js,jsx,ts,tsx,json,css,scss,md}`
6. **On code reformat**: 체크
7. **On save**: 체크 (저장 시 자동 포매팅)
8. **Apply** 클릭

## 6. 자동 포매팅 설정

### 저장 시 자동 포매팅

1. **File** → **Settings** → **Tools** → **Actions on Save**
2. 다음 옵션 활성화:
   - ✅ **Reformat code**
   - ✅ **Run Prettier** (프론트엔드 파일용)
   - ✅ **Optimize imports**
   - ✅ **Rearrange code**

### 수동 포매팅 단축키

- **전체 파일 포매팅**: `Ctrl + Alt + L` (Windows/Linux) 또는 `Cmd + Option + L` (Mac)
- **선택 영역 포매팅**: 영역 선택 후 `Ctrl + Alt + L`

## 7. 현재 브랜치와 develop 브랜치 포매팅 맞추기

### 방법 1: IntelliJ에서 전체 프로젝트 포매팅

1. 프로젝트 루트 폴더 선택
2. **Code** → **Reformat Code** (`Ctrl + Alt + L`)
3. **Scope**: **Whole project** 선택
4. **Run** 클릭

### 방법 2: Git으로 develop 브랜치의 포매팅 설정 가져오기

```bash
# develop 브랜치의 .editorconfig 확인
git checkout develop -- .editorconfig .prettierrc

# 변경된 파일 포매팅 적용
# IntelliJ에서 Ctrl + Alt + L로 전체 포매팅
```

### 방법 3: 특정 파일만 포매팅

1. 포매팅이 필요한 파일 열기
2. `Ctrl + Alt + L` (또는 **Code** → **Reformat Code**)
3. **Do not show this dialog in the future** 체크 후 **Run**

## 8. 들여쓰기 문제 해결

### 탭과 스페이스 혼용 문제

1. **View** → **Active Editor** → **Show Whitespaces** (또는 `Ctrl + Shift + 8`)
   - 탭은 `→`로, 스페이스는 점(·)으로 표시됩니다
2. 탭을 스페이스로 변환:
   - **Edit** → **Convert Indents** → **To Spaces**

### 특정 파일의 들여쓰기 확인

1. 파일 열기
2. 우측 하단 상태바에서 들여쓰기 정보 확인
   - 예: `Tabs: 4` 또는 `Spaces: 2`
3. 클릭하여 변경 가능

## 9. 프로젝트별 설정 저장 (팀 공유)

현재 설정을 프로젝트에 저장하려면:

1. **File** → **Settings** → **Editor** → **Code Style**
2. 우측 상단 톱니바퀴 아이콘 클릭
3. **Export** → **IntelliJ IDEA code style XML**
4. `.idea/codeStyles/` 폴더에 저장 (Git에 커밋)

## 10. 검증 방법

### Java 파일
```java
public class Test {
    // 4칸 들여쓰기 확인
    public void method() {
        // 8칸 들여쓰기 (메서드 내부)
        if (condition) {
            // 12칸 들여쓰기
        }
    }
}
```

### JavaScript/JSX 파일
```javascript
function test() {
  // 2칸 들여쓰기 확인
  if (condition) {
    // 4칸 들여쓰기
    return true;
  }
}
```

## 문제 해결

### EditorConfig가 적용되지 않는 경우

1. **File** → **Invalidate Caches** → **Invalidate and Restart**
2. IntelliJ 재시작 후 다시 시도

### Prettier가 작동하지 않는 경우

1. `frontend/node_modules/prettier` 경로 확인
2. **File** → **Settings** → **Languages & Frameworks** → **JavaScript** → **Prettier**
3. **Prettier package** 경로 재설정

### 여전히 들여쓰기가 맞지 않는 경우

1. 문제가 있는 파일을 열고 `Ctrl + Alt + L`로 포매팅
2. **Edit** → **Convert Indents** → **To Spaces** 실행
3. 다시 `Ctrl + Alt + L`로 포매팅
