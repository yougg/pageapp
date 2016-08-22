$(function()
{
	var emptyInputMsg = "在此处输入或粘贴数字";
	var emptyOutputMsg = "转换结果显示在这里";
	var formattedEmptyInputMsg = '<span style="color: #777;">'+emptyInputMsg+'</span>';
	var formattedEmptyOutputMsg = '<span style="color: #777;">'+emptyOutputMsg+'</span>';

	// Hides placeholder text
	$('#input').on('focus', function()
	{
		var val = this.innerText.replace(/\n/g,'<br>');
		if (!val)
		{
			$(this).html(formattedEmptyInputMsg);
			$('#output').html(formattedEmptyOutputMsg);
		}
		else if (val == emptyInputMsg)
		{
			$(this).html("");
		}
	});

	// Shows placeholder text
	$('#input').on('blur', function()
	{
		var val = this.innerText.replace(/\n/g,'<br>');
		if (!val)
		{
			$(this).html(formattedEmptyInputMsg);
			$('#output').html(formattedEmptyOutputMsg);
		}
	}).blur();

	// Automatically do the conversion
	$('#input').keyup(function()
	{
		var input = this.innerText.replace(/\n/g,'<br>');
		if (!input)
		{
			$('#output').html(formattedEmptyOutputMsg);
			return;
		}

		var output = convertNum(input);
		$('#output').html(output);
	});

	// Fill in sample numbers if the user wants to see an example
	$('#sample').click(function()
	{
		$('#input').text('0123456789').keyup();
	});
});

/*
	Convert Number
	by yougg

	https://github.com/yougg/convert-number

	A simple utility to convert number to different number char.
*/
function convertNum(numbers)
{
	var res = '';
	var tab = document.getElementById('brand');
	var rows = [];
    for(var i = 0, len = tab.rows.length; i < len; i++)
    {
    	if (tab.rows[i].cells[0].firstChild.checked)
    	{
			rows.push(tab.rows[i])
    	}
    }
    for(var i = 0, len = numbers.length; i < len; i++)
    {
    	var c = numbers.charAt(i);
        if (/[0-9]/.test(c))
        {
    		var n = parseInt(c);
			var v = Math.floor(Math.random()*rows.length);
			try
			{
				res += rows[v].cells[n+1].innerText;
			}
			catch(e)
			{
				res += c;
			}
        }
        else
        {
        	res += c;
        }
    }
	return res;
}
