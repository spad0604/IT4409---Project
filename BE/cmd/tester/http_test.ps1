$ErrorActionPreference = "Continue"
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$email = "fulltest_${ts}@test.com"
$pass = 0
$fail = 0

function Assert-OK($name, $cond) {
    if ($cond) { $script:pass++; Write-Host "[PASS] $name" -ForegroundColor Green }
    else { $script:fail++; Write-Host "[FAIL] $name" -ForegroundColor Red }
}

# ═══════════════════════════════════════
# 1. Auth: Register + Login
# ═══════════════════════════════════════
Write-Host "`n=== AUTH ==="
$regBody = "{`"email`":`"$email`",`"password`":`"Test@123456`",`"name`":`"Full Tester`"}"
$reg = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/register" -Method POST -Body $regBody -ContentType "application/json"
$token = $reg.data.token
Assert-OK "Register" ($token.Length -gt 10)

$loginBody = "{`"email`":`"$email`",`"password`":`"Test@123456`"}"
$login = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
Assert-OK "Login" ($login.data.user.id.Length -eq 36)

$headers = @{ Authorization = "Bearer $token" }

# ═══════════════════════════════════════
# 2. User Profile
# ═══════════════════════════════════════
Write-Host "`n=== USERS ==="
$me = Invoke-RestMethod -Uri "http://localhost:8080/api/users/me" -Method GET -Headers $headers
Assert-OK "Get Profile" ($me.data.email -eq $email)

# ═══════════════════════════════════════
# 3. Project
# ═══════════════════════════════════════
Write-Host "`n=== PROJECTS ==="
$projBody = "{`"name`":`"Test Project $ts`",`"key`":`"TP$ts`",`"description`":`"Full test`",`"type`":`"kanban`"}"
$proj = Invoke-RestMethod -Uri "http://localhost:8080/api/projects" -Method POST -Body $projBody -ContentType "application/json" -Headers $headers
$projectId = $proj.data.id
Assert-OK "Create Project" ($projectId.Length -eq 36)

$projList = Invoke-RestMethod -Uri "http://localhost:8080/api/projects" -Method GET -Headers $headers
Assert-OK "List Projects" ($projList.data.Count -ge 1)

# ═══════════════════════════════════════
# 4. Board + Columns
# ═══════════════════════════════════════
Write-Host "`n=== BOARDS ==="
$boardBody = '{"name":"Sprint Board"}'
$board = Invoke-RestMethod -Uri "http://localhost:8080/api/projects/$projectId/boards" -Method POST -Body $boardBody -ContentType "application/json" -Headers $headers
$boardId = $board.id
Assert-OK "Create Board" ($boardId.Length -eq 36)

$detail = Invoke-RestMethod -Uri "http://localhost:8080/api/boards/$boardId" -Method GET -Headers $headers
Assert-OK "Board has 4 columns" ($detail.columns.Count -eq 4)

# ═══════════════════════════════════════
# 5. Labels
# ═══════════════════════════════════════
Write-Host "`n=== LABELS ==="
$labelBody = '{"name":"Bug","color":"#ef4444"}'
$label = Invoke-RestMethod -Uri "http://localhost:8080/api/projects/$projectId/labels" -Method POST -Body $labelBody -ContentType "application/json" -Headers $headers
Assert-OK "Create Label" ($label.name -eq "Bug")

$labels = Invoke-RestMethod -Uri "http://localhost:8080/api/projects/$projectId/labels" -Method GET -Headers $headers
Assert-OK "List Labels" ($labels.Count -ge 1)

# ═══════════════════════════════════════
# 6. Issues (Nguoi A)
# ═══════════════════════════════════════
Write-Host "`n=== ISSUES ==="
$issueBody = '{"title":"Fix login bug","type":"bug","priority":"high","description":"Login crashes on empty email"}'
$issue = Invoke-RestMethod -Uri "http://localhost:8080/api/projects/$projectId/issues" -Method POST -Body $issueBody -ContentType "application/json" -Headers $headers
$issueKey = $issue.data.key
$issueId = $issue.data.id
Assert-OK "Create Issue" ($issueKey -like "*-1")
Assert-OK "Issue type=bug" ($issue.data.type -eq "bug")
Assert-OK "Issue priority=high" ($issue.data.priority -eq "high")
Assert-OK "Issue status=todo" ($issue.data.status -eq "todo")

# Get issue by key
$gotIssue = Invoke-RestMethod -Uri "http://localhost:8080/api/issues/$issueKey" -Method GET -Headers $headers
Assert-OK "Get Issue by key" ($gotIssue.data.id -eq $issueId)

# Update issue
$patchBody = '{"title":"Fix login crash","priority":"critical"}'
$updated = Invoke-RestMethod -Uri "http://localhost:8080/api/issues/$issueKey" -Method PATCH -Body $patchBody -ContentType "application/json" -Headers $headers
Assert-OK "Update Issue title" ($updated.data.title -eq "Fix login crash")
Assert-OK "Update Issue priority" ($updated.data.priority -eq "critical")

# Change status
$statusBody = '{"status":"in_progress"}'
$statusRes = Invoke-RestMethod -Uri "http://localhost:8080/api/issues/$issueKey/status" -Method PUT -Body $statusBody -ContentType "application/json" -Headers $headers
Assert-OK "Change Status" ($statusRes.data.status -eq "in_progress")

# Assign issue
$assignBody = "{`"assigneeId`":`"$($login.data.user.id)`"}"
$assignRes = Invoke-RestMethod -Uri "http://localhost:8080/api/issues/$issueKey/assign" -Method PUT -Body $assignBody -ContentType "application/json" -Headers $headers
Assert-OK "Assign Issue" ($assignRes.data.assigneeId -eq $login.data.user.id)

# List issues
$issueList = Invoke-RestMethod -Uri "http://localhost:8080/api/projects/$projectId/issues" -Method GET -Headers $headers
Assert-OK "List Issues" ($issueList.data.items.Count -ge 1)

# Create subtask
$subBody = "{`"title`":`"Investigate root cause`",`"type`":`"subtask`",`"parentId`":`"$issueId`"}"
$sub = Invoke-RestMethod -Uri "http://localhost:8080/api/projects/$projectId/issues" -Method POST -Body $subBody -ContentType "application/json" -Headers $headers
Assert-OK "Create Subtask" ($sub.data.type -eq "subtask")

# List subtasks
$subtasks = Invoke-RestMethod -Uri "http://localhost:8080/api/issues/$issueKey/subtasks" -Method GET -Headers $headers
Assert-OK "List Subtasks" ($subtasks.data.Count -ge 1)

# ═══════════════════════════════════════
# 7. Comments (Nguoi A)
# ═══════════════════════════════════════
Write-Host "`n=== COMMENTS ==="
$cmtBody = '{"content":"This is a test comment"}'
$cmt = Invoke-RestMethod -Uri "http://localhost:8080/api/issues/$issueKey/comments" -Method POST -Body $cmtBody -ContentType "application/json" -Headers $headers
$cmtId = $cmt.data.id
Assert-OK "Add Comment" ($cmtId.Length -eq 36)

# List comments
$cmtList = Invoke-RestMethod -Uri "http://localhost:8080/api/issues/$issueKey/comments" -Method GET -Headers $headers
Assert-OK "List Comments" ($cmtList.data.items.Count -ge 1)

# Edit comment
$editBody = '{"content":"Updated comment content"}'
$edited = Invoke-RestMethod -Uri "http://localhost:8080/api/comments/$cmtId" -Method PATCH -Body $editBody -ContentType "application/json" -Headers $headers
Assert-OK "Edit Comment" ($edited.data.content -eq "Updated comment content")

# Delete comment
$delCmt = Invoke-RestMethod -Uri "http://localhost:8080/api/comments/$cmtId" -Method DELETE -Headers $headers
Assert-OK "Delete Comment" ($delCmt.status -eq 200)

# ═══════════════════════════════════════
# 8. Attachments (Nguoi B)
# ═══════════════════════════════════════
Write-Host "`n=== ATTACHMENTS ==="
# Tạo file tạm để upload
$tmpFile = [System.IO.Path]::GetTempFileName()
Set-Content -Path $tmpFile -Value "Test attachment content for issue"

try {
    $attUri = "http://localhost:8080/api/issues/$issueKey/attachments"
    $fileBytes = [System.IO.File]::ReadAllBytes($tmpFile)
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    $bodyLines = (
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"test.txt`"",
        "Content-Type: text/plain",
        "",
        [System.Text.Encoding]::UTF8.GetString($fileBytes),
        "--$boundary--"
    )
    $bodyStr = $bodyLines -join $LF
    $ct = "multipart/form-data; boundary=$boundary"
    $att = Invoke-RestMethod -Uri $attUri -Method POST -Body $bodyStr -ContentType $ct -Headers $headers
    $attId = $att.data.id
    Assert-OK "Upload Attachment" ($attId.Length -eq 36)
} catch {
    Assert-OK "Upload Attachment" $false
    $attId = ""
}

# List attachments
try {
    $attList = Invoke-RestMethod -Uri "http://localhost:8080/api/issues/$issueKey/attachments" -Method GET -Headers $headers
    Assert-OK "List Attachments" ($attList.data.Count -ge 1)
} catch {
    Assert-OK "List Attachments" $false
}

# Delete attachment
if ($attId -ne "") {
    try {
        $delAtt = Invoke-RestMethod -Uri "http://localhost:8080/api/attachments/$attId" -Method DELETE -Headers $headers
        Assert-OK "Delete Attachment" ($delAtt.status -eq 200)
    } catch {
        Assert-OK "Delete Attachment" $false
    }
} else {
    Assert-OK "Delete Attachment (skipped)" $false
}

Remove-Item -Path $tmpFile -ErrorAction SilentlyContinue

# ═══════════════════════════════════════
# 9. Search (Nguoi B)
# ═══════════════════════════════════════
Write-Host "`n=== SEARCH ==="
try {
    $searchRes = Invoke-RestMethod -Uri "http://localhost:8080/api/search?q=login" -Method GET -Headers $headers
    Assert-OK "Search issues" ($searchRes.data.issues.Count -ge 1 -or $searchRes.status -eq 200)
} catch {
    Assert-OK "Search issues" $false
}

# ═══════════════════════════════════════
# 10. Security: No JWT
# ═══════════════════════════════════════
Write-Host "`n=== SECURITY ==="
try {
    Invoke-RestMethod -Uri "http://localhost:8080/api/projects" -Method GET -ErrorAction Stop
    Assert-OK "Block without JWT" $false
} catch {
    Assert-OK "Block without JWT" $true
}

# ═══════════════════════════════════════
# Summary
# ═══════════════════════════════════════
Write-Host "`n=========================================="
Write-Host "TOTAL: $($pass + $fail) | PASS: $pass | FAIL: $fail" -ForegroundColor $(if ($fail -eq 0) {"Green"} else {"Red"})
Write-Host "=========================================="
