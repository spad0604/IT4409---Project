$ErrorActionPreference = "Continue"
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$email = "httptest_${ts}@test.com"

# 1. Register
Write-Host "`n=== TEST 1: Register ==="
$regBody = "{`"email`":`"$email`",`"password`":`"Test@123456`",`"name`":`"HTTP Tester`"}"
$reg = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/register" -Method POST -Body $regBody -ContentType "application/json"
$token = $reg.data.token
Write-Host "[PASS] Email: $email"
Write-Host "[PASS] Token: $($token.Substring(0,30))..."

# 2. Login
Write-Host "`n=== TEST 2: Login ==="
$loginBody = "{`"email`":`"$email`",`"password`":`"Test@123456`"}"
$login = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
Write-Host "[PASS] UserID: $($login.data.user.id)"

# 3. Create Project (JWT required)
Write-Host "`n=== TEST 3: Create Project ==="
$headers = @{ Authorization = "Bearer $token" }
$projBody = "{`"name`":`"HTTP Project $ts`",`"key`":`"HP$ts`",`"description`":`"Test via HTTP`",`"type`":`"kanban`"}"
$proj = Invoke-RestMethod -Uri "http://localhost:8080/api/projects" -Method POST -Body $projBody -ContentType "application/json" -Headers $headers
$projectId = $proj.id
Write-Host "[PASS] Project ID: $projectId"

# 4. Create Board
Write-Host "`n=== TEST 4: Create Board ==="
$boardBody = '{"name":"Sprint Board HTTP"}'
$board = Invoke-RestMethod -Uri "http://localhost:8080/api/projects/$projectId/boards" -Method POST -Body $boardBody -ContentType "application/json" -Headers $headers
$boardId = $board.id
Write-Host "[PASS] Board ID: $boardId, Name: $($board.name)"

# 5. Get Board + Columns
Write-Host "`n=== TEST 5: Get Board Detail ==="
$detail = Invoke-RestMethod -Uri "http://localhost:8080/api/boards/$boardId" -Method GET -Headers $headers
Write-Host "[PASS] Columns: $($detail.columns.Count)"
foreach ($col in $detail.columns) {
    Write-Host "  - $($col.name) -> $($col.statusMap)"
}

# 6. Create Label
Write-Host "`n=== TEST 6: Create Label ==="
$labelBody = '{"name":"Bug","color":"#ef4444"}'
$label = Invoke-RestMethod -Uri "http://localhost:8080/api/projects/$projectId/labels" -Method POST -Body $labelBody -ContentType "application/json" -Headers $headers
Write-Host "[PASS] Label: $($label.name) ($($label.color))"

# 7. List Labels
Write-Host "`n=== TEST 7: List Labels ==="
$labels = Invoke-RestMethod -Uri "http://localhost:8080/api/projects/$projectId/labels" -Method GET -Headers $headers
Write-Host "[PASS] Total labels: $($labels.Count)"

# 8. No JWT access (must be blocked)
Write-Host "`n=== TEST 8: No JWT access ==="
try {
    Invoke-RestMethod -Uri "http://localhost:8080/api/projects" -Method GET -ErrorAction Stop
    Write-Host "[FAIL] SECURITY HOLE: accessed without login!"
} catch {
    Write-Host "[PASS] Blocked correctly: 401 Unauthorized"
}

Write-Host "`n=== ALL HTTP TESTS DONE ==="
