import { IsHexColor, IsOptional, IsString, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { FileUploadDto } from "@core/dto/file-upload.dto";

export class ConfigUpdateDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @ApiProperty({type: 'string', format: 'binary'})
  icon: FileUploadDto;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  function: string;

  @IsHexColor()
  @IsOptional()
  @MaxLength(20)
  primaryColor: string;

  @IsHexColor()
  @IsOptional()
  @MaxLength(20)
  secondaryColor: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  problematic: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  audience: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  solution: string;
}