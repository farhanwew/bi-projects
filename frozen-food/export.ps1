$xl=New-Object -ComObject Excel.Application; $xl.Visible=$false; $xl.DisplayAlerts=$false
$out=@()
foreach($f in Get-ChildItem "$PSScriptRoot\Data Pembelian Frozen Food\*.xlsx"){
  $wb=$xl.Workbooks.Open($f.FullName,0,$true)
  $best=$null; foreach($s in $wb.Worksheets){ if(-not $best -or $s.UsedRange.Rows.Count -gt $best.UsedRange.Rows.Count){$best=$s} }
  $v=$best.UsedRange.Value2; $n=$v.GetLength(0)
  for($i=2;$i -le $n;$i++){
    $d=$v[$i,1]; if($d -is [double]){$d=[DateTime]::FromOADate($d).ToString('yyyy-MM-dd')}
    $out+=[pscustomobject]@{File=$f.BaseName;Tgl=$d;Kode=$v[$i,2];Barang=$v[$i,3];Qty=$v[$i,4];Satuan=$v[$i,5];Harga=$v[$i,6];Jumlah=$v[$i,7];Nama=$v[$i,8]}
  }
  $wb.Close($false)
}
$xl.Quit()
$out | Export-Csv "$PSScriptRoot\all_data.csv" -NoTypeInformation -Encoding UTF8
"rows: $($out.Count)"
