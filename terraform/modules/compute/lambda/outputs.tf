output "lambda_invoke_arns" {
  value = {
    auth   = aws_lambda_function.auth.invoke_arn
    item   = aws_lambda_function.item.invoke_arn
    search = aws_lambda_function.search.invoke_arn
    image  = aws_lambda_function.image.invoke_arn
    admin  = aws_lambda_function.admin.invoke_arn
  }
}

output "lambda_function_names" {
  value = {
    auth   = aws_lambda_function.auth.function_name
    item   = aws_lambda_function.item.function_name
    search = aws_lambda_function.search.function_name
    image  = aws_lambda_function.image.function_name
    admin  = aws_lambda_function.admin.function_name
  }
}

output "execution_role_arn" {
  value = aws_iam_role.lambda_execution.arn
}
