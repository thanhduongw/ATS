import axiosClient from "../../services/axiosClient";
import type { CustomFieldDefinition, CustomFieldDefinitionRequest, ApiMessageResponse } from "./types";

export const getCustomFieldDefinitions = () =>
  axiosClient.get<CustomFieldDefinition[]>("/candidate/custom-field-definitions");

export const createCustomFieldDefinition = (data: CustomFieldDefinitionRequest) =>
  axiosClient.post<CustomFieldDefinition>("/candidate/custom-field-definitions", data);

export const updateCustomFieldDefinition = (id: number, data: CustomFieldDefinitionRequest) =>
  axiosClient.put<CustomFieldDefinition>(`/candidate/custom-field-definitions/${id}`, data);

export const deleteCustomFieldDefinition = (id: number) =>
  axiosClient.delete<ApiMessageResponse>(`/candidate/custom-field-definitions/${id}`);
