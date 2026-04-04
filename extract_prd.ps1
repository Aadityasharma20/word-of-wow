$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open("c:\Users\LENOVO\Desktop\WORD OF WOW\Word_of_Wow_PRD_v1.docx")
$text = $doc.Content.Text
$text | Out-File -FilePath "c:\Users\LENOVO\Desktop\WORD OF WOW\PRD_text.txt" -Encoding UTF8
$doc.Close($false)
$word.Quit()
