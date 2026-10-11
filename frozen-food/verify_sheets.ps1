$xl=New-Object -ComObject Excel.Application; $xl.Visible=$false; $xl.DisplayAlerts=$false
foreach($f in Get-ChildItem "$PSScriptRoot\Data Pembelian Frozen Food\*.xlsx"){
  $wb=$xl.Workbooks.Open($f.FullName,0,$true)
  $info=@(); foreach($s in $wb.Worksheets){
    $v=$s.UsedRange.Value2; $rows=0; $sum=0.0
    if($v -is [array]){ for($i=1;$i -le $v.GetLength(0);$i++){ $k=$v[$i,2]; $j=$v[$i,7]
        if($k -and $k -ne 'KODEBARA' -and $j -is [double]){ $rows++; $sum+=$j } } }
    $info+=[pscustomobject]@{Sheet=$s.Name;Rows=$rows;Sum=$sum} }
  $big=$info | sort Rows -desc | select -first 1
  $oth=$info | ?{$_.Sheet -ne $big.Sheet}
  "{0}: sheets={1} | terbesar='{2}' rows={3} sum={4:N0} | jumlah sheet lain rows={5} sum={6:N0}" -f $f.BaseName,$info.Count,$big.Sheet,$big.Rows,$big.Sum,($oth|measure Rows -Sum).Sum,($oth|measure Sum -Sum).Sum
  $wb.Close($false)
}
$xl.Quit()
